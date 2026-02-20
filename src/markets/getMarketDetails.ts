import { TradePoolAbi } from '../abi/TradeMarketsAbi.js';
import { multicallRead, type MulticallResult } from '../utils/multicall.js';
import type { GetMarketDetailsParams, MarketDetails, MarketOption } from './types.js';

// The 18 global view functions we read from the pool diamond
const GLOBAL_FUNCTIONS = [
  'poolState',
  'numberOfOptions',
  'startTime',
  'endTime',
  'oracleEndTime',
  'allFunds',
  'allVotes',
  'totalLiquidity',
  'winner',
  'poolFinalized',
  'isPublic',
  'baseToken',
  'baseTokenDecimals',
  'poolOwner',
  'resolver',
  'resolverIsAI',
  'isDisputed',
  'isAppealed',
] as const;

export async function getMarketDetails(
  params: GetMarketDetailsParams
): Promise<MarketDetails> {
  const { marketId, apiUrl, rpcUrl } = params;

  if (!apiUrl) throw new Error('apiUrl is required');
  if (!rpcUrl) throw new Error('rpcUrl is required');
  if (!marketId) throw new Error('marketId is required');

  // 1. Fetch from API
  const res = await fetch(`${apiUrl}/pools/pool/${marketId}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch market: ${res.status}`);
  }

  const json = await res.json();
  // API may return { data: {...} } or the object directly
  const apiData = json.data ?? json;

  const contractAddress = apiData.contractAddress as `0x${string}` | undefined;
  if (!contractAddress) {
    throw new Error('Market response missing contractAddress');
  }

  const apiOptions: { choiceIndex: number; optionName: string }[] =
    apiData.options ?? apiData.choices ?? [];

  // 2. Multicall batch 1 — 18 global reads
  const globalContracts = GLOBAL_FUNCTIONS.map((fn) => ({
    address: contractAddress,
    abi: TradePoolAbi,
    functionName: fn,
  }));

  const globalResults = await multicallRead(rpcUrl, globalContracts);

  // Parse global results (throw on any failure — these are essential)
  const globals = {} as Record<string, unknown>;
  for (let i = 0; i < GLOBAL_FUNCTIONS.length; i++) {
    const r = globalResults[i];
    if (r.status !== 'success') {
      throw new Error(`Failed to read ${GLOBAL_FUNCTIONS[i]} from contract`);
    }
    globals[GLOBAL_FUNCTIONS[i]] = r.result;
  }

  // 3. Multicall batch 2 — 3 calls per option (getCurrentPrice, totalFunds, totalVotes)
  const optionCount = apiOptions.length;
  const perOptionContracts = [];
  for (let i = 0; i < optionCount; i++) {
    const idx = BigInt(apiOptions[i].choiceIndex ?? i);
    perOptionContracts.push(
      {
        address: contractAddress,
        abi: TradePoolAbi,
        functionName: 'getCurrentPrice',
        args: [idx],
      },
      {
        address: contractAddress,
        abi: TradePoolAbi,
        functionName: 'totalFunds',
        args: [idx],
      },
      {
        address: contractAddress,
        abi: TradePoolAbi,
        functionName: 'totalVotes',
        args: [idx],
      },
    );
  }

  let perOptionResults: readonly MulticallResult[] = [];
  if (perOptionContracts.length > 0) {
    perOptionResults = await multicallRead(rpcUrl, perOptionContracts);
  }

  // 4. Assemble enriched options (graceful degradation on per-option failures)
  const options: MarketOption[] = apiOptions.map((opt, i) => {
    const base = i * 3;
    const priceResult = perOptionResults[base];
    const fundsResult = perOptionResults[base + 1];
    const votesResult = perOptionResults[base + 2];

    return {
      choiceIndex: opt.choiceIndex ?? i,
      optionName: opt.optionName ?? `Option ${i}`,
      currentPrice: priceResult?.status === 'success' ? BigInt(priceResult.result as any) : 0n,
      totalFunds: fundsResult?.status === 'success' ? BigInt(fundsResult.result as any) : 0n,
      totalVotes: votesResult?.status === 'success' ? BigInt(votesResult.result as any) : 0n,
    };
  });

  // 5. Assemble MarketDetails
  return {
    id: apiData.id ?? apiData._id ?? marketId,
    title: apiData.title ?? apiData.question ?? '',
    status: apiData.status ?? 'New',
    contractAddress,
    options,

    poolState: Number(globals.poolState),
    numberOfOptions: BigInt(globals.numberOfOptions as any),
    startTime: BigInt(globals.startTime as any),
    endTime: BigInt(globals.endTime as any),
    oracleEndTime: BigInt(globals.oracleEndTime as any),
    allFunds: BigInt(globals.allFunds as any),
    allVotes: BigInt(globals.allVotes as any),
    totalLiquidity: BigInt(globals.totalLiquidity as any),
    winner: BigInt(globals.winner as any),
    poolFinalized: globals.poolFinalized as boolean,
    isPublic: globals.isPublic as boolean,
    baseToken: globals.baseToken as `0x${string}`,
    baseTokenDecimals: BigInt(globals.baseTokenDecimals as any),
    poolOwner: globals.poolOwner as `0x${string}`,
    resolver: globals.resolver as `0x${string}`,
    resolverIsAI: globals.resolverIsAI as boolean,
    isDisputed: globals.isDisputed as boolean,
    isAppealed: globals.isAppealed as boolean,
  };
}
