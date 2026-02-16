export interface EnterOptionTxParams {
    marketContractAddress: `0x${string}`;
    selectedOption: bigint;
    buyAmountInWei: bigint;
}

export interface RawTransaction {
    to: `0x${string}`;
    data: `0x${string}`;
    value?: bigint;
}

export type ApproveTxParams = {
    tokenAddress: `0x${string}`;
    spender: `0x${string}`;
    amount?: bigint; // defaults to max uint256
};

export interface EnterLimitOptionTxParams {
    marketContractAddress: `0x${string}`;           // TradeMarket contract
    selectedOption: number;
    pricePerShare: bigint;     // price per share
    buyAmountInWei: bigint;                 // total buy amount
    tokenDecimals?: number;
}

export interface CreateMarketTxParams {
    isPublic: boolean;
    isPublicPoolResolverAi: boolean;
    creator: `0x${string}`; // smartAccount
    startTime: bigint; // unix timestamp (seconds)
    endTime: bigint;   // unix timestamp (seconds)
    options: bigint; // market options
    disputeTimer: number;
    ipfsUrl: string;
    inputAmountWei: bigint;
    barValues: number[]; // transformedBarValues
    baseToken: `0x${string}`; // TOKEN contract address
    tokenDecimals?: number;
    factoryContractAddress?: `0x${string}`;
}

export interface ClaimTxParams {
    marketId: string;
    walletAddress: `0x${string}`;
    apiUrl?: string;
    rpcUrl?: string;
}

export interface GetUserOptionSharesParams {
    options: [{ choiceIndex: number, optionName: string }];
    walletAddress: `0x${string}`;
    marketContractAddress: `0x${string}`;
    rpcUrl: string;
}
