import { TradePoolAbi } from '../abi/TradeMarketsAbi.js';
import { multicallRead, type MulticallResult } from '../utils/multicall.js';
import type { GetMarketLiquidityParams, MarketLiquidity } from './types.js';

export async function getMarketLiquidity(
  params: GetMarketLiquidityParams
): Promise<MarketLiquidity> {
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

  // 2. Multicall batch: totalLiquidity() + allFunds() + per-option calls
  const contracts = [
    {
      address: contractAddress,
      abi: TradePoolAbi,
      functionName: 'totalLiquidity',
      args: [],
    },
    {
      address: contractAddress,
      abi: TradePoolAbi,
      functionName: 'allFunds',
      args: [],
    },
    ...apiOptions.flatMap((opt, i) => {
      const optionId = BigInt(opt.choiceIndex ?? i);
      return [
        {
          address: contractAddress,
          abi: TradePoolAbi,
          functionName: 'totalFunds',
          args: [optionId],
        },
        {
          address: contractAddress,
          abi: TradePoolAbi,
          functionName: 'firstBuyOrderPrice',
          args: [optionId],
        },
        {
          address: contractAddress,
          abi: TradePoolAbi,
          functionName: 'firstSellOrderPrice',
          args: [optionId],
        },
      ];
    }),
  ];

  const results: readonly MulticallResult[] = await multicallRead(rpcUrl, contracts);

  // 3. Parse results
  const totalLiquidityResult = results[0];
  const totalLiquidity =
    totalLiquidityResult?.status === 'success' ? BigInt(totalLiquidityResult.result as any) : 0n;

  const allFundsResult = results[1];
  const allFunds =
    allFundsResult?.status === 'success' ? BigInt(allFundsResult.result as any) : 0n;

  const optionLiquidity = apiOptions.map((opt, i) => {
    const base = 2 + i * 3;
    const fundsResult = results[base];
    const buyPriceResult = results[base + 1];
    const sellPriceResult = results[base + 2];
    return {
      choiceIndex: opt.choiceIndex ?? i,
      optionName: opt.optionName ?? `Option ${i}`,
      totalFunds: fundsResult?.status === 'success' ? BigInt(fundsResult.result as any) : 0n,
      firstBuyOrderPrice: buyPriceResult?.status === 'success' ? BigInt(buyPriceResult.result as any) : 0n,
      firstSellOrderPrice: sellPriceResult?.status === 'success' ? BigInt(sellPriceResult.result as any) : 0n,
    };
  });

  return {
    marketId,
    contractAddress,
    totalLiquidity,
    allFunds,
    optionLiquidity,
  };
}
