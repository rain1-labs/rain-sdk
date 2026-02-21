import { subgraphQuery } from '../utils/subgraph.js';
import {
  Transaction,
  GetMarketTransactionsParams,
  MarketTransactionsResult,
} from './types.js';
import {
  ENTITY_FIELDS,
  ENTITY_CONFIG,
  getEnabledEntities,
  parseEntity,
} from './shared.js';

function buildWhereClause(
  poolAddress: string,
  fromTimestamp?: bigint,
  toTimestamp?: bigint,
): string {
  const parts: string[] = [`poolAddress: "${poolAddress}"`];
  if (fromTimestamp !== undefined) parts.push(`blockTimestamp_gte: "${fromTimestamp.toString()}"`);
  if (toTimestamp !== undefined) parts.push(`blockTimestamp_lte: "${toTimestamp.toString()}"`);
  return `{ ${parts.join(', ')} }`;
}

function buildQuery(params: {
  marketAddress: string;
  fromTimestamp?: bigint;
  toTimestamp?: bigint;
  limit: number;
  orderDirection: string;
  enabledEntities: string[];
}): string {
  const { marketAddress, fromTimestamp, toTimestamp, limit, orderDirection, enabledEntities } = params;
  const pool = marketAddress.toLowerCase();
  const where = buildWhereClause(pool, fromTimestamp, toTimestamp);

  const parts: string[] = [];

  for (const entity of enabledEntities) {
    const fields = ENTITY_FIELDS[entity as keyof typeof ENTITY_FIELDS];
    parts.push(
      `  ${entity}(where: ${where}, orderBy: blockTimestamp, orderDirection: ${orderDirection}, first: ${limit}) { ${fields} }`
    );
  }

  return `{\n${parts.join('\n')}\n}`;
}

export async function getMarketTransactions(params: GetMarketTransactionsParams): Promise<MarketTransactionsResult> {
  const {
    marketAddress,
    types,
    fromTimestamp,
    toTimestamp,
    first = 20,
    skip = 0,
    orderDirection = 'desc',
    subgraphUrl,
  } = params;

  const enabledEntities = getEnabledEntities(types);
  const fetchLimit = first + skip;

  const query = buildQuery({
    marketAddress,
    fromTimestamp,
    toTimestamp,
    limit: fetchLimit,
    orderDirection,
    enabledEntities,
  });

  const data = await subgraphQuery<Record<string, any[]>>(subgraphUrl, query);

  const allTransactions: Transaction[] = [];
  const seenIds = new Set<string>();

  for (const entity of enabledEntities) {
    const items = data[entity] ?? [];
    for (const item of items) {
      if (!seenIds.has(item.id)) {
        seenIds.add(item.id);
        allTransactions.push(parseEntity(entity, item));
      }
    }
  }

  // Sort by timestamp
  allTransactions.sort((a, b) => {
    return orderDirection === 'desc'
      ? Number(b.timestamp - a.timestamp)
      : Number(a.timestamp - b.timestamp);
  });

  // Apply pagination
  const paginated = allTransactions.slice(skip, skip + first);

  return {
    marketAddress,
    transactions: paginated,
    total: allTransactions.length,
  };
}
