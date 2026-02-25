import { TradePoolAbi } from '../abi/TradeMarketsAbi.js';
import { multicallRead, type MulticallResult } from '../utils/multicall.js';
import { subgraphQuery } from '../utils/subgraph.js';
import type { GetProtocolStatsParams, MarketStatus, ProtocolStats } from './types.js';

const PAGE_LIMIT = 200;

const ACTIVE_STATUSES: Set<string> = new Set<MarketStatus>([
  'Trading',
  'Live',
  'New',
  'ClosingSoon',
]);

export async function getProtocolStats(
  params: GetProtocolStatsParams
): Promise<ProtocolStats> {
  const { apiUrl, rpcUrl, subgraphUrl, subgraphApiKey } = params;

  if (!apiUrl) throw new Error('apiUrl is required');
  if (!rpcUrl) throw new Error('rpcUrl is required');

  // Phase 1 — Paginate all markets from API
  let allMarkets: any[] = [];
  let offset = 0;
  while (true) {
    const res = await fetch(`${apiUrl}/pools/public-pools?limit=${PAGE_LIMIT}&offset=${offset}`);
    if (!res.ok) {
      throw new Error(`Failed to fetch markets: ${res.status}`);
    }
    const batch = await res.json();
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

  const totalMarkets = allMarkets.length;

  // Count active markets
  const activeMarkets = allMarkets.filter(
    (m: any) => ACTIVE_STATUSES.has(m.status)
  ).length;

  // Filter to markets with a contract address for on-chain reads
  const marketsWithContract = allMarkets.filter(
    (m: any) => m.contractAddress
  );

  // Phase 2 — Multicall: totalLiquidity() + allFunds() per market
  let tvl = 0n;
  let totalVolume = 0n;

  if (marketsWithContract.length > 0) {
    const contracts = marketsWithContract.flatMap((m: any) => {
      const addr = m.contractAddress as `0x${string}`;
      return [
        { address: addr, abi: TradePoolAbi, functionName: 'totalLiquidity', args: [] },
        { address: addr, abi: TradePoolAbi, functionName: 'allFunds', args: [] },
      ];
    });

    const results: readonly MulticallResult[] = await multicallRead(rpcUrl, contracts);

    for (let i = 0; i < marketsWithContract.length; i++) {
      const liqResult = results[i * 2];
      const fundsResult = results[i * 2 + 1];

      if (liqResult?.status === 'success') {
        tvl += BigInt(liqResult.result as any);
      }
      if (fundsResult?.status === 'success') {
        totalVolume += BigInt(fundsResult.result as any);
      }
    }
  }

  // Phase 3 — Unique traders from subgraph
  let uniqueTraders = 0;

  if (subgraphUrl) {
    const wallets = new Set<string>();

    // Entity types and which fields contain wallet addresses
    const entityQueries: { entity: string; fields: string[] }[] = [
      { entity: 'enterOptions', fields: ['wallet'] },
      { entity: 'placeBuyOrders', fields: ['maker'] },
      { entity: 'placeSellOrders', fields: ['maker'] },
      { entity: 'executeBuyOrders', fields: ['maker', 'taker'] },
      { entity: 'executeSellOrders', fields: ['maker', 'taker'] },
    ];

    for (const { entity, fields } of entityQueries) {
      let cursor = '';
      while (true) {
        const whereClause = cursor ? `where: { id_gt: "${cursor}" }` : '';
        const query = `{ ${entity}(first: 1000, orderBy: id, orderDirection: asc, ${whereClause}) { id ${fields.join(' ')} } }`;

        const data = await subgraphQuery<Record<string, any[]>>(
          subgraphUrl,
          query,
          subgraphApiKey,
        );

        const items = data[entity] ?? [];
        for (const item of items) {
          for (const field of fields) {
            if (item[field]) {
              wallets.add((item[field] as string).toLowerCase());
            }
          }
        }

        if (items.length < 1000) break;
        cursor = items[items.length - 1].id;
      }
    }

    uniqueTraders = wallets.size;
  }

  return {
    tvl,
    totalVolume,
    activeMarkets,
    totalMarkets,
    uniqueTraders,
  };
}
