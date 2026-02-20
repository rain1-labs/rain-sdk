export type MarketStatus = 'Live' | 'New' | 'WaitingForResult' | 'UnderDispute' | 'UnderAppeal' | 'ClosingSoon' | 'InReview' | 'InEvaluation' | 'Closed' | 'Trading';

export type MarketSortBy =
    | 'Liquidity'
    | 'Volumn'
    | 'latest';

export interface GetMarketsParams {
    limit?: number;
    offset?: number;
    sortBy?: MarketSortBy;
    status?: MarketStatus;
    apiUrl?: string;
}

export interface Market {
    id: string;
    title: string;
    totalVolume: string;
    status: MarketStatus;
    // add more fields as your API returns
}

export interface MarketOption {
    choiceIndex: number;
    optionName: string;
    currentPrice: bigint;
    totalFunds: bigint;
    totalVotes: bigint;
}

export interface MarketDetails {
    // From API
    id: string;
    title: string;
    status: MarketStatus;
    contractAddress: `0x${string}`;
    options: MarketOption[];

    // From on-chain
    poolState: number;
    numberOfOptions: bigint;
    startTime: bigint;
    endTime: bigint;
    oracleEndTime: bigint;
    allFunds: bigint;
    allVotes: bigint;
    totalLiquidity: bigint;
    winner: bigint;
    poolFinalized: boolean;
    isPublic: boolean;
    baseToken: `0x${string}`;
    baseTokenDecimals: bigint;
    poolOwner: `0x${string}`;
    resolver: `0x${string}`;
    resolverIsAI: boolean;
    isDisputed: boolean;
    isAppealed: boolean;
}

export interface GetMarketDetailsParams {
    marketId: string;
    apiUrl: string;
    rpcUrl: string;
}
