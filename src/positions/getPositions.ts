import { TradePoolAbi } from '../abi/TradeMarketsAbi.js';
import { multicallRead } from '../utils/multicall.js';
import type { GetPositionsParams, MarketPosition, OptionPosition, PositionsResult } from './types.js';

const PAGE_LIMIT = 200;

export async function getPositions(params: GetPositionsParams): Promise<PositionsResult> {
  const { address, apiUrl, rpcUrl } = params;

  if (!address) throw new Error('address is required');
  if (!apiUrl) throw new Error('apiUrl is required');
  if (!rpcUrl) throw new Error('rpcUrl is required');

  // Phase 1 — Fetch all markets from API with pagination
  let allMarkets: any[] = [];
  let offset = 0;
  while (true) {
    const res = await fetch(`${apiUrl}/pools/public-pools?limit=${PAGE_LIMIT}&offset=${offset}`);
    if (!res.ok) {
      throw new Error(`Failed to fetch markets: ${res.status}`);
    }
    const batch = await res.json();
    // API may return: plain array, { data: [...] }, or { data: { pools: [...] } }
    let items: any[];
    if (Array.isArray(batch)) {
      items = batch;
    } else if (batch && typeof batch === 'object') {
      if (Array.isArray(batch.data)) {
        items = batch.data;
      } else if (Array.isArray(batch.data?.pools)) {
        items = batch.data.pools;
      } else if (Array.isArray(batch.pools)) {
        items = batch.pools;
      } else {
        items = [];
      }
    } else {
      items = [];
    }
    allMarkets = allMarkets.concat(items);
    if (items.length < PAGE_LIMIT) break;
    offset += PAGE_LIMIT;
  }

  // Filter out markets missing contractAddress
  const marketsWithContract = allMarkets.filter(
    (m: any) => m.contractAddress
  );

  if (marketsWithContract.length === 0) {
    return { address, markets: [] };
  }

  // Phase 2 — Single multicall batch across all markets
  // Per market: userLiquidity(address), claimed(address), getDynamicPayout(address)
  // Per option: userVotes(optionIdx, address), userVotesInEscrow(optionIdx, address),
  //             userAmountInEscrow(optionIdx, address), getCurrentPrice(optionIdx)
  const contracts: any[] = [];
  // Track where each market's results start and how many options it has
  const indexMap: { startIndex: number; optionCount: number; marketIndex: number }[] = [];

  for (let mi = 0; mi < marketsWithContract.length; mi++) {
    const market = marketsWithContract[mi];
    const contractAddress = market.contractAddress as `0x${string}`;
    const options: any[] = market.options ?? market.choices ?? [];
    const startIndex = contracts.length;

    // 3 per-market reads
    contracts.push(
      { address: contractAddress, abi: TradePoolAbi, functionName: 'userLiquidity', args: [address] },
      { address: contractAddress, abi: TradePoolAbi, functionName: 'claimed', args: [address] },
      { address: contractAddress, abi: TradePoolAbi, functionName: 'getDynamicPayout', args: [address] },
    );

    // 4 per-option reads
    for (let oi = 0; oi < options.length; oi++) {
      const idx = BigInt(options[oi].choiceIndex ?? oi);
      contracts.push(
        { address: contractAddress, abi: TradePoolAbi, functionName: 'userVotes', args: [idx, address] },
        { address: contractAddress, abi: TradePoolAbi, functionName: 'userVotesInEscrow', args: [idx, address] },
        { address: contractAddress, abi: TradePoolAbi, functionName: 'userAmountInEscrow', args: [idx, address] },
        { address: contractAddress, abi: TradePoolAbi, functionName: 'getCurrentPrice', args: [idx] },
      );
    }

    indexMap.push({ startIndex, optionCount: options.length, marketIndex: mi });
  }

  const results = await multicallRead(rpcUrl, contracts);

  // Phase 3 — Filter and assemble
  const markets: MarketPosition[] = [];

  for (const entry of indexMap) {
    const market = marketsWithContract[entry.marketIndex];
    const apiOptions: any[] = market.options ?? market.choices ?? [];
    let idx = entry.startIndex;

    // Per-market reads (graceful degradation)
    const userLiquidityResult = results[idx++];
    const claimedResult = results[idx++];
    const dynamicPayoutResult = results[idx++];

    const userLiquidity = userLiquidityResult?.status === 'success'
      ? BigInt(userLiquidityResult.result as any)
      : 0n;
    const claimed = claimedResult?.status === 'success'
      ? (claimedResult.result as boolean)
      : false;
    const dynamicPayout: bigint[] = dynamicPayoutResult?.status === 'success'
      ? (Array.isArray(dynamicPayoutResult.result)
          ? (dynamicPayoutResult.result as any[]).map((v: any) => BigInt(v))
          : [])
      : [];

    // Per-option reads
    const options: OptionPosition[] = [];
    let hasPosition = userLiquidity > 0n;

    for (let oi = 0; oi < entry.optionCount; oi++) {
      const sharesResult = results[idx++];
      const sharesInEscrowResult = results[idx++];
      const amountInEscrowResult = results[idx++];
      const priceResult = results[idx++];

      const shares = sharesResult?.status === 'success' ? BigInt(sharesResult.result as any) : 0n;
      const sharesInEscrow = sharesInEscrowResult?.status === 'success' ? BigInt(sharesInEscrowResult.result as any) : 0n;
      const amountInEscrow = amountInEscrowResult?.status === 'success' ? BigInt(amountInEscrowResult.result as any) : 0n;
      const currentPrice = priceResult?.status === 'success' ? BigInt(priceResult.result as any) : 0n;

      if (shares > 0n || sharesInEscrow > 0n || amountInEscrow > 0n) {
        hasPosition = true;
      }

      options.push({
        choiceIndex: apiOptions[oi]?.choiceIndex ?? oi,
        optionName: apiOptions[oi]?.optionName ?? `Option ${oi}`,
        shares,
        sharesInEscrow,
        amountInEscrow,
        currentPrice,
      });
    }

    if (!hasPosition) continue;

    markets.push({
      marketId: market.id ?? market._id ?? '',
      title: market.title ?? market.question ?? '',
      status: market.status ?? 'New',
      contractAddress: market.contractAddress as `0x${string}`,
      options,
      userLiquidity,
      claimed,
      dynamicPayout,
    });
  }

  return { address, markets };
}
