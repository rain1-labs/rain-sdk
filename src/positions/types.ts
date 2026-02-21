export interface GetPositionsParams {
  address: `0x${string}`;
  apiUrl: string;
  rpcUrl: string;
}

export interface OptionPosition {
  choiceIndex: number;
  optionName: string;
  shares: bigint;
  sharesInEscrow: bigint;
  amountInEscrow: bigint;
  currentPrice: bigint;
}

export interface MarketPosition {
  marketId: string;
  title: string;
  status: string;
  contractAddress: `0x${string}`;
  options: OptionPosition[];
  userLiquidity: bigint;
  claimed: boolean;
  dynamicPayout: bigint[];
}

export interface PositionsResult {
  address: `0x${string}`;
  markets: MarketPosition[];
}

export interface GetPositionByMarketParams {
  address: `0x${string}`;
  marketId: string;
  apiUrl: string;
  rpcUrl: string;
}

export interface PositionByMarket {
  marketId: string;
  title: string;
  status: string;
  contractAddress: `0x${string}`;
  options: OptionPosition[];
  userLiquidity: bigint;
  claimed: boolean;
  dynamicPayout: bigint[];
}
