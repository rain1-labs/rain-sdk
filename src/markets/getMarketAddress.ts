import type { GetMarketAddressParams } from './types.js';

export async function getMarketAddress(
  params: GetMarketAddressParams
): Promise<`0x${string}`> {
  const { marketId, apiUrl } = params;

  if (!apiUrl) throw new Error('apiUrl is required');
  if (!marketId) throw new Error('marketId is required');

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

  return contractAddress;
}
