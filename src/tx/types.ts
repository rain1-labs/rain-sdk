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
