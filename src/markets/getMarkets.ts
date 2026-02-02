import { API_BASE_URL } from '../config/api';
import { MARKET_STATUS } from './constants';
import { GetMarketsParams, Market } from './types';

export async function getMarkets(
    params: GetMarketsParams
): Promise<Market[]> {
    const query = new URLSearchParams();
    if (params?.limit) query.append('limit', params.limit.toString());
    if (params?.offset) query.append('offset', params.offset.toString());
    if (params?.sortBy) query.append('sortBy', params.sortBy);
    if (params?.status) query.append('status', MARKET_STATUS[params.status]);
    const res = await fetch(`${API_BASE_URL}/pools/public-pools?${query.toString()}`);
    console.log('params: ', params)
    if (!res.ok) {
        throw new Error(`Failed to fetch markets: ${res.status}`);
    }

    const data = await res.json();
    return data;
}
