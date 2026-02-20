import { TradePoolAbi } from '../abi/TradeMarketsAbi.js';
import { multicallRead, type MulticallResult } from '../utils/multicall.js';
import type { GetMarketPricesParams, OptionPrice } from './types.js';

export async function getMarketPrices(
  params: GetMarketPricesParams
): Promise<OptionPrice[]> {
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

  // 2. Skip multicall if zero options
  if (apiOptions.length === 0) {
    return [];
  }

  // 3. Single multicall batch — 1 call per option: getCurrentPrice
  const priceContracts = apiOptions.map((_opt, i) => ({
    address: contractAddress,
    abi: TradePoolAbi,
    functionName: 'getCurrentPrice',
    args: [BigInt(i)],
  }));

  const priceResults: readonly MulticallResult[] = await multicallRead(rpcUrl, priceContracts);

  // 4. Map results to OptionPrice[] with graceful degradation
  return apiOptions.map((opt, i) => {
    const result = priceResults[i];
    return {
      choiceIndex: opt.choiceIndex ?? i,
      optionName: opt.optionName ?? `Option ${i}`,
      currentPrice: result?.status === 'success' ? BigInt(result.result as any) : 0n,
    };
  });
}
