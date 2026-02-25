export interface GetPnLParams {
  address: `0x${string}`;
  marketAddress?: `0x${string}`;
  subgraphUrl: string;
  subgraphApiKey?: string;
  apiUrl: string;
  rpcUrl: string;
}

export interface OptionPnL {
  choiceIndex: number;
  optionName: string;
  buyShares: bigint;
  buyCost: bigint;
  sellShares: bigint;
  sellProceeds: bigint;
  currentShares: bigint;
  currentValue: bigint;
  costBasis: bigint;
  realizedPnL: bigint;
  unrealizedPnL: bigint;
}

export interface MarketPnL {
  marketId: string;
  title: string;
  status: string;
  contractAddress: `0x${string}`;
  options: OptionPnL[];
  claimed: boolean;
  claimReward: bigint;
  liquidityCost: bigint;
  liquidityReward: bigint;
  totalCostBasis: bigint;
  totalCurrentValue: bigint;
  realizedPnL: bigint;
  unrealizedPnL: bigint;
  totalPnL: bigint;
}

export interface PnLResult {
  address: `0x${string}`;
  markets: MarketPnL[];
  totalRealizedPnL: bigint;
  totalUnrealizedPnL: bigint;
  totalPnL: bigint;
}
