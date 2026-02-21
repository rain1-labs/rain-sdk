export type TransactionType =
  | 'buy'
  | 'limit_buy_placed'
  | 'limit_sell_placed'
  | 'limit_buy_filled'
  | 'limit_sell_filled'
  | 'cancel_buy'
  | 'cancel_sell'
  | 'add_liquidity'
  | 'claim';

export interface Transaction {
  type: TransactionType;
  id: string;
  marketAddress: `0x${string}`;
  transactionHash: `0x${string}`;
  blockNumber: bigint;
  timestamp: bigint;
  wallet: `0x${string}`;

  // Trading fields
  option?: number;
  baseAmount?: bigint;
  optionAmount?: bigint;
  price?: bigint;
  orderId?: number;

  // Order execution fields
  maker?: `0x${string}`;
  taker?: `0x${string}`;

  // Claim fields
  winnerOption?: number;
  reward?: bigint;
  liquidityReward?: bigint;
  totalReward?: bigint;
}

export interface GetTransactionsParams {
  address: `0x${string}`;
  marketAddress?: `0x${string}`;
  types?: TransactionType[];
  fromTimestamp?: bigint;
  toTimestamp?: bigint;
  first?: number;
  skip?: number;
  orderDirection?: 'asc' | 'desc';
  subgraphUrl: string;
}

export interface TransactionsResult {
  address: `0x${string}`;
  transactions: Transaction[];
  total: number;
}

export interface InternalGetTransactionsParams extends GetTransactionsParams {
  // Filled in by Rain class
}

export interface TransactionDetails {
  transactionHash: `0x${string}`;
  blockNumber: bigint;
  timestamp: bigint;
  from: `0x${string}`;
  to: `0x${string}`;
  status: 'success' | 'failed';
  gasUsed: bigint;
  effectiveGasPrice: bigint;

  // Decoded Rain events from subgraph (a single tx can emit multiple events)
  events: Transaction[];
}

export interface GetTransactionDetailsParams {
  transactionHash: `0x${string}`;
  subgraphUrl: string;
  rpcUrl: string;
}

export interface GetMarketTransactionsParams {
  marketAddress: `0x${string}`;
  types?: TransactionType[];
  fromTimestamp?: bigint;
  toTimestamp?: bigint;
  first?: number;
  skip?: number;
  orderDirection?: 'asc' | 'desc';
  subgraphUrl: string;
}

export interface MarketTransactionsResult {
  marketAddress: `0x${string}`;
  transactions: Transaction[];
  total: number;
}
