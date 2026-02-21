import { TradePoolAbi } from '../abi/TradeMarketsAbi.js';
import { multicallRead, type MulticallResult } from '../utils/multicall.js';
import type { GetMarketVolumeParams, MarketVolume } from './types.js';

export async function getMarketVolume(
  params: GetMarketVolumeParams
): Promise<MarketVolume> {
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
  const apiData = json.data ?? json;

  const contractAddress = apiData.contractAddress as `0x${string}` | undefined;
  if (!contractAddress) {
    throw new Error('Market response missing contractAddress');
  }

  const apiOptions: { choiceIndex: number; optionName: string }[] =
    apiData.options ?? apiData.choices ?? [];

  // 2. Multicall batch: allFunds() + totalFunds(optionId) per option
  const contracts = [
    {
      address: contractAddress,
      abi: TradePoolAbi,
      functionName: 'allFunds',
      args: [],
    },
    ...apiOptions.map((opt, i) => ({
      address: contractAddress,
      abi: TradePoolAbi,
      functionName: 'totalFunds',
      args: [BigInt(opt.choiceIndex ?? i)],
    })),
  ];

  const results: readonly MulticallResult[] = await multicallRead(rpcUrl, contracts);

  // 3. Parse results
  const allFundsResult = results[0];
  const totalVolume =
    allFundsResult?.status === 'success' ? BigInt(allFundsResult.result as any) : 0n;

  const optionVolumes = apiOptions.map((opt, i) => {
    const result = results[i + 1];
    return {
      choiceIndex: opt.choiceIndex ?? i,
      optionName: opt.optionName ?? `Option ${i}`,
      volume: result?.status === 'success' ? BigInt(result.result as any) : 0n,
    };
  });

  return {
    marketId,
    contractAddress,
    totalVolume,
    optionVolumes,
  };
}
