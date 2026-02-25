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
    marketQuestion: string;
    marketOptions: string[];
    marketTags: string[];
    marketDescription: string;
    isPublic: boolean;
    isPublicPoolResolverAi: boolean;
    creator: `0x${string}`; // smartAccount
    startTime: bigint; // unix timestamp (seconds)
    endTime: bigint;   // unix timestamp (seconds)
    no_of_options: bigint; // market options
    disputeTimer: number;
    inputAmountWei: bigint;
    barValues: number[]; // transformedBarValues
    baseToken: `0x${string}`; // TOKEN contract address
    tokenDecimals?: number;
    factoryContractAddress?: `0x${string}`;
    apiUrl?: string;
    rpcUrl?: string;
}

export interface ClaimTxParams {
    marketId: string;
    walletAddress: `0x${string}`;
    apiUrl?: string;
    rpcUrl?: string;
}

export interface DepositToSmartAccountTxParams {
    tokenAddress: `0x${string}`;
    smartAccountAddress: `0x${string}`;
    amount: bigint;
}

export interface WithdrawFromSmartAccountTxParams {
    tokenAddress: `0x${string}`;
    eoaAddress: `0x${string}`;
    amount: bigint;
}

export interface SellOptionTxParams {
    marketContractAddress: `0x${string}`;
    selectedOption: number;
    pricePerShare: number;       // 0 < price < 1
    shares: bigint;              // number of votes/shares to sell
    tokenDecimals?: number;      // defaults to 6 (USDT)
}

export interface CancelOrdersTxParams {
    marketContractAddress: `0x${string}`;
    orders: {
        option: number;
        price: number;      // 0 < price < 1 (decimal, converted to 1e18 internally)
        orderID: bigint;
    }[];
}

export interface GetUserOptionSharesParams {
    options: [{ choiceIndex: number, optionName: string }];
    walletAddress: `0x${string}`;
    marketContractAddress: `0x${string}`;
    rpcUrl: string;
}

export interface CloseMarketTxParams {
    marketId: string;
    apiUrl?: string;
    rpcUrl?: string;
}

export interface ChooseWinnerTxParams {
    marketId: string;
    winningOption: number; // 1-indexed
    apiUrl?: string;
    rpcUrl?: string;
}

export interface AddLiquidityTxParams {
    marketContractAddress: `0x${string}`;
    liquidityAmountInWei: bigint;
}

export interface ResolveMarketTxParams {
    marketId: string;
    winningOption: number; // 1-indexed
    apiUrl?: string;
    rpcUrl?: string;
}
