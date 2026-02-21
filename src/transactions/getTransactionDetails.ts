import { subgraphQuery } from '../utils/subgraph.js';
import {
  Transaction,
  TransactionType,
  TransactionDetails,
  GetTransactionDetailsParams,
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

const ENTITY_TYPE_MAP: Record<string, TransactionType> = {
  enterOptions: 'buy',
  placeBuyOrders: 'limit_buy_placed',
  placeSellOrders: 'limit_sell_placed',
  executeBuyOrders: 'limit_buy_filled',
  executeSellOrders: 'limit_sell_filled',
  cancelBuyOrders: 'cancel_buy',
  cancelSellOrders: 'cancel_sell',
  enterLiquiditys: 'add_liquidity',
  claims: 'claim',
};

function parseEntity(entity: string, raw: any): Transaction {
  const type = ENTITY_TYPE_MAP[entity];
  const base: Transaction = {
    type,
    id: raw.id,
    marketAddress: raw.poolAddress as `0x${string}`,
    transactionHash: raw.transactionHash as `0x${string}`,
    blockNumber: BigInt(raw.blockNumber),
    timestamp: BigInt(raw.blockTimestamp),
    wallet: (raw.wallet ?? raw.maker ?? raw.orderCreator ?? raw.taker) as `0x${string}`,
  };

  if (raw.option !== undefined) base.option = Number(raw.option);
  if (raw.orderOption !== undefined) base.option = Number(raw.orderOption);
  if (raw.baseAmount !== undefined) base.baseAmount = BigInt(raw.baseAmount);
  if (raw.optionAmount !== undefined) base.optionAmount = BigInt(raw.optionAmount);
  if (raw.orderAmount !== undefined) base.optionAmount = BigInt(raw.orderAmount);
  if (raw.orderPrice !== undefined) base.price = BigInt(raw.orderPrice);
  if (raw.orderID !== undefined) base.orderId = Number(raw.orderID);

  if (raw.maker) base.maker = raw.maker as `0x${string}`;
  if (raw.taker) base.taker = raw.taker as `0x${string}`;

  if (raw.winnerOption !== undefined) base.winnerOption = Number(raw.winnerOption);
  if (raw.reward !== undefined) base.reward = BigInt(raw.reward);
  if (raw.liquidityReward !== undefined) base.liquidityReward = BigInt(raw.liquidityReward);
  if (raw.totalReward !== undefined) base.totalReward = BigInt(raw.totalReward);

  return base;
}

function buildSubgraphQuery(txHash: string): string {
  const hash = txHash.toLowerCase();
  const parts: string[] = [];

  for (const entity of Object.keys(ENTITY_FIELDS)) {
    const fields = ENTITY_FIELDS[entity as keyof typeof ENTITY_FIELDS];
    parts.push(
      `  ${entity}(where: { transactionHash: "${hash}" }) { ${fields} }`
    );
  }

  return `{\n${parts.join('\n')}\n}`;
}

async function fetchReceipt(
  rpcUrl: string,
  txHash: string,
): Promise<{ from: string; to: string; status: string; gasUsed: string; effectiveGasPrice: string; blockNumber: string }> {
  const res = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'eth_getTransactionReceipt',
      params: [txHash],
    }),
  });
  const json = await res.json();
  if (!json.result) {
    throw new Error(`Transaction receipt not found for ${txHash}`);
  }
  return json.result;
}

async function fetchBlockTimestamp(rpcUrl: string, blockNumber: string): Promise<string> {
  const res = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 2,
      method: 'eth_getBlockByNumber',
      params: [blockNumber, false],
    }),
  });
  const json = await res.json();
  if (!json.result) {
    throw new Error(`Block not found for ${blockNumber}`);
  }
  return json.result.timestamp;
}

export async function getTransactionDetails(
  params: GetTransactionDetailsParams,
): Promise<TransactionDetails> {
  const { transactionHash, subgraphUrl, rpcUrl } = params;

  const query = buildSubgraphQuery(transactionHash);

  // Fetch on-chain receipt and subgraph events in parallel
  const [receipt, subgraphData] = await Promise.all([
    fetchReceipt(rpcUrl, transactionHash),
    subgraphQuery<Record<string, any[]>>(subgraphUrl, query),
  ]);

  // Fetch block timestamp using the block number from the receipt
  const timestamp = await fetchBlockTimestamp(rpcUrl, receipt.blockNumber);

  // Parse all subgraph events
  const events: Transaction[] = [];
  const seenIds = new Set<string>();

  for (const entity of Object.keys(ENTITY_FIELDS)) {
    const items = subgraphData[entity] ?? [];
    for (const item of items) {
      if (!seenIds.has(item.id)) {
        seenIds.add(item.id);
        events.push(parseEntity(entity, item));
      }
    }
  }

  // Sort events by type for consistent ordering
  events.sort((a, b) => a.type.localeCompare(b.type));

  return {
    transactionHash: transactionHash as `0x${string}`,
    blockNumber: BigInt(receipt.blockNumber),
    timestamp: BigInt(timestamp),
    from: receipt.from as `0x${string}`,
    to: receipt.to as `0x${string}`,
    status: receipt.status === '0x1' ? 'success' : 'failed',
    gasUsed: BigInt(receipt.gasUsed),
    effectiveGasPrice: BigInt(receipt.effectiveGasPrice),
    events,
  };
}
