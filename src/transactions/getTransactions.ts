import { subgraphQuery } from '../utils/subgraph.js';
import {
  Transaction,
  TransactionType,
  TransactionsResult,
  GetTransactionsParams,
} from './types.js';

const ENTITY_FIELDS = {
  enterOptions: 'id poolAddress option baseAmount optionAmount wallet blockNumber blockTimestamp transactionHash',
  placeBuyOrders: 'id poolAddress orderOption orderPrice orderAmount orderID maker blockNumber blockTimestamp transactionHash',
  placeSellOrders: 'id poolAddress orderOption orderPrice orderAmount orderID maker blockNumber blockTimestamp transactionHash',
  executeBuyOrders: 'id poolAddress orderOption orderPrice optionAmount baseAmount orderID maker taker blockNumber blockTimestamp transactionHash',
  executeSellOrders: 'id poolAddress orderOption orderPrice optionAmount baseAmount orderID maker taker blockNumber blockTimestamp transactionHash',
  cancelBuyOrders: 'id poolAddress orderOption orderAmount orderPrice orderID orderCreator blockNumber blockTimestamp transactionHash',
  cancelSellOrders: 'id poolAddress orderOption orderAmount orderPrice orderID orderCreator blockNumber blockTimestamp transactionHash',
  enterLiquiditys: 'id poolAddress baseAmount wallet blockNumber blockTimestamp transactionHash',
  claims: 'id poolAddress wallet winnerOption liquidityReward reward totalReward blockNumber blockTimestamp transactionHash',
} as const;

// Map entity name → address field name and transaction type
const ENTITY_CONFIG: Record<string, { addressField: string; type: TransactionType }> = {
  enterOptions: { addressField: 'wallet', type: 'buy' },
  placeBuyOrders: { addressField: 'maker', type: 'limit_buy_placed' },
  placeSellOrders: { addressField: 'maker', type: 'limit_sell_placed' },
  executeBuyOrders: { addressField: 'maker', type: 'limit_buy_filled' },
  executeSellOrders: { addressField: 'maker', type: 'limit_sell_filled' },
  cancelBuyOrders: { addressField: 'orderCreator', type: 'cancel_buy' },
  cancelSellOrders: { addressField: 'orderCreator', type: 'cancel_sell' },
  enterLiquiditys: { addressField: 'wallet', type: 'add_liquidity' },
  claims: { addressField: 'wallet', type: 'claim' },
};

// ExecuteBuyOrder/ExecuteSellOrder also match on `taker`
const TAKER_ENTITIES: Record<string, TransactionType> = {
  executeBuyOrders: 'limit_buy_filled',
  executeSellOrders: 'limit_sell_filled',
};

function getEnabledEntities(types?: TransactionType[]): string[] {
  if (!types || types.length === 0) {
    return Object.keys(ENTITY_CONFIG);
  }
  const typeSet = new Set(types);
  return Object.entries(ENTITY_CONFIG)
    .filter(([, cfg]) => typeSet.has(cfg.type))
    .map(([entity]) => entity);
}

function buildWhereClause(
  addressField: string,
  address: string,
  marketAddress?: string,
  fromTimestamp?: bigint,
  toTimestamp?: bigint,
): string {
  const parts: string[] = [`${addressField}: "${address}"`];
  if (marketAddress) parts.push(`poolAddress: "${marketAddress}"`);
  if (fromTimestamp !== undefined) parts.push(`blockTimestamp_gte: "${fromTimestamp.toString()}"`);
  if (toTimestamp !== undefined) parts.push(`blockTimestamp_lte: "${toTimestamp.toString()}"`);
  return `{ ${parts.join(', ')} }`;
}

function buildQuery(params: {
  address: string;
  marketAddress?: string;
  fromTimestamp?: bigint;
  toTimestamp?: bigint;
  limit: number;
  orderDirection: string;
  enabledEntities: string[];
}): string {
  const { address, marketAddress, fromTimestamp, toTimestamp, limit, orderDirection, enabledEntities } = params;
  const addr = address.toLowerCase();
  const pool = marketAddress?.toLowerCase();

  const parts: string[] = [];

  for (const entity of enabledEntities) {
    const cfg = ENTITY_CONFIG[entity];
    const fields = ENTITY_FIELDS[entity as keyof typeof ENTITY_FIELDS];
    const where = buildWhereClause(cfg.addressField, addr, pool, fromTimestamp, toTimestamp);

    parts.push(
      `  ${entity}(where: ${where}, orderBy: blockTimestamp, orderDirection: ${orderDirection}, first: ${limit}) { ${fields} }`
    );

    // For execute orders, also query where user is taker
    if (entity in TAKER_ENTITIES) {
      const takerWhere = buildWhereClause('taker', addr, pool, fromTimestamp, toTimestamp);
      parts.push(
        `  ${entity}AsTaker: ${entity}(where: ${takerWhere}, orderBy: blockTimestamp, orderDirection: ${orderDirection}, first: ${limit}) { ${fields} }`
      );
    }
  }

  return `{\n${parts.join('\n')}\n}`;
}

function parseEntity(entity: string, raw: any): Transaction {
  const cfg = ENTITY_CONFIG[entity];
  const base: Transaction = {
    type: cfg.type,
    id: raw.id,
    marketAddress: raw.poolAddress as `0x${string}`,
    transactionHash: raw.transactionHash as `0x${string}`,
    blockNumber: BigInt(raw.blockNumber),
    timestamp: BigInt(raw.blockTimestamp),
    wallet: (raw.wallet ?? raw.maker ?? raw.orderCreator ?? raw.taker) as `0x${string}`,
  };

  // Trading fields
  if (raw.option !== undefined) base.option = Number(raw.option);
  if (raw.orderOption !== undefined) base.option = Number(raw.orderOption);
  if (raw.baseAmount !== undefined) base.baseAmount = BigInt(raw.baseAmount);
  if (raw.optionAmount !== undefined) base.optionAmount = BigInt(raw.optionAmount);
  if (raw.orderAmount !== undefined) base.optionAmount = BigInt(raw.orderAmount);
  if (raw.orderPrice !== undefined) base.price = BigInt(raw.orderPrice);
  if (raw.orderID !== undefined) base.orderId = Number(raw.orderID);

  // Maker/taker
  if (raw.maker) base.maker = raw.maker as `0x${string}`;
  if (raw.taker) base.taker = raw.taker as `0x${string}`;

  // Claim fields
  if (raw.winnerOption !== undefined) base.winnerOption = Number(raw.winnerOption);
  if (raw.reward !== undefined) base.reward = BigInt(raw.reward);
  if (raw.liquidityReward !== undefined) base.liquidityReward = BigInt(raw.liquidityReward);
  if (raw.totalReward !== undefined) base.totalReward = BigInt(raw.totalReward);

  return base;
}

export async function getTransactions(params: GetTransactionsParams): Promise<TransactionsResult> {
  const {
    address,
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

  // Fetch enough from each entity to cover skip + first after merging
  const fetchLimit = first + skip;

  const query = buildQuery({
    address,
    marketAddress,
    fromTimestamp,
    toTimestamp,
    limit: fetchLimit,
    orderDirection,
    enabledEntities,
  });

  const data = await subgraphQuery<Record<string, any[]>>(subgraphUrl, query);

  // Parse all results into unified Transaction objects
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

    // Also parse taker results for execute orders
    if (entity in TAKER_ENTITIES) {
      const takerItems = data[`${entity}AsTaker`] ?? [];
      for (const item of takerItems) {
        if (!seenIds.has(item.id)) {
          seenIds.add(item.id);
          allTransactions.push(parseEntity(entity, item));
        }
      }
    }
  }

  // Sort by timestamp
  allTransactions.sort((a, b) => {
    const diff = orderDirection === 'desc'
      ? Number(b.timestamp - a.timestamp)
      : Number(a.timestamp - b.timestamp);
    return diff;
  });

  // Apply pagination
  const paginated = allTransactions.slice(skip, skip + first);

  return {
    address,
    transactions: paginated,
    total: allTransactions.length,
  };
}
