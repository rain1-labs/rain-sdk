import { TradePoolAbi } from '../abi/TradeMarketsAbi.js';
import { multicallRead } from '../utils/multicall.js';
import type { GetPositionByMarketParams, OptionPosition, PositionByMarket } from './types.js';

export async function getPositionByMarket(params: GetPositionByMarketParams): Promise<PositionByMarket> {
  const { address, marketId, apiUrl, rpcUrl } = params;

  if (!address) throw new Error('address is required');
  if (!marketId) throw new Error('marketId is required');
  if (!apiUrl) throw new Error('apiUrl is required');
  if (!rpcUrl) throw new Error('rpcUrl is required');

  // 1. Fetch single market from API
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

  // 2. Build multicall batch
  // 3 per-market reads + 4 per-option reads
  const contracts: any[] = [];

  contracts.push(
    { address: contractAddress, abi: TradePoolAbi, functionName: 'userLiquidity', args: [address] },
    { address: contractAddress, abi: TradePoolAbi, functionName: 'claimed', args: [address] },
    { address: contractAddress, abi: TradePoolAbi, functionName: 'getDynamicPayout', args: [address] },
  );

  for (let oi = 0; oi < apiOptions.length; oi++) {
    const idx = BigInt(apiOptions[oi].choiceIndex ?? oi);
    contracts.push(
      { address: contractAddress, abi: TradePoolAbi, functionName: 'userVotes', args: [idx, address] },
      { address: contractAddress, abi: TradePoolAbi, functionName: 'userVotesInEscrow', args: [idx, address] },
      { address: contractAddress, abi: TradePoolAbi, functionName: 'userAmountInEscrow', args: [idx, address] },
      { address: contractAddress, abi: TradePoolAbi, functionName: 'getCurrentPrice', args: [idx] },
    );
  }

  const results = await multicallRead(rpcUrl, contracts);

  // 3. Parse results with graceful degradation
  let idx = 0;

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

  const options: OptionPosition[] = [];
  for (let oi = 0; oi < apiOptions.length; oi++) {
    const sharesResult = results[idx++];
    const sharesInEscrowResult = results[idx++];
    const amountInEscrowResult = results[idx++];
    const priceResult = results[idx++];

    const shares = sharesResult?.status === 'success' ? BigInt(sharesResult.result as any) : 0n;
    const sharesInEscrow = sharesInEscrowResult?.status === 'success' ? BigInt(sharesInEscrowResult.result as any) : 0n;
    const amountInEscrow = amountInEscrowResult?.status === 'success' ? BigInt(amountInEscrowResult.result as any) : 0n;
    const currentPrice = priceResult?.status === 'success' ? BigInt(priceResult.result as any) : 0n;

    options.push({
      choiceIndex: apiOptions[oi]?.choiceIndex ?? oi,
      optionName: apiOptions[oi]?.optionName ?? `Option ${oi}`,
      shares,
      sharesInEscrow,
      amountInEscrow,
      currentPrice,
    });
  }

  return {
    marketId: apiData.id ?? apiData._id ?? marketId,
    title: apiData.title ?? apiData.question ?? '',
    status: apiData.status ?? 'New',
    contractAddress,
    options,
    userLiquidity,
    claimed,
    dynamicPayout,
  };
}
