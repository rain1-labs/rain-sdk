import { encodeFunctionData } from "viem";
import { ERC20Abi } from "../abi/ERC20Abi";
import { ApproveTxParams, RawTransaction } from "./types";
import { ethers } from "ethers";

const DEFAULT_APPROVE_AMOUNT = ethers.MaxUint256;

export function buildApproveRawTx(
    params: ApproveTxParams
): RawTransaction | Error {
    const {
        tokenAddress,
        spender,
        amount = DEFAULT_APPROVE_AMOUNT,
    } = params;

    if (!params.tokenAddress) throw new Error("token address is required");
    if (!params.spender) throw new Error("spender address is required");

    return {
        to: tokenAddress,
        data: encodeFunctionData({
            abi: ERC20Abi,
            functionName: "approve",
            args: [spender, amount],
        }),
        value: 0n,
    };
}
