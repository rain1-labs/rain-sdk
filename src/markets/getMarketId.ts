import { getMarkets } from './getMarkets.js';
import type { GetMarketIdParams } from './types.js';

export async function getMarketId(
  params: GetMarketIdParams
): Promise<string> {
  const { marketAddress, apiUrl } = params;

  if (!apiUrl) throw new Error('apiUrl is required');
  if (!marketAddress) throw new Error('marketAddress is required');

  const addressLower = marketAddress.toLowerCase();
  const limit = 50;
  let offset = 0;

  while (true) {
    const markets = await getMarkets({ limit, offset, apiUrl });

    const match = markets.find(
      (m) => m.contractAddress?.toLowerCase() === addressLower
    );

    if (match) {
      return match.id;
    }

    if (markets.length < limit) {
      break;
    }

    offset += limit;
  }

  throw new Error(`No market found with address ${marketAddress}`);
}
