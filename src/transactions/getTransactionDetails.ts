import { subgraphQuery } from '../utils/subgraph.js';
import {
  Transaction,
  TransactionDetails,
  GetTransactionDetailsParams,
} from './types.js';
import { ENTITY_FIELDS, parseEntity } from './shared.js';

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
