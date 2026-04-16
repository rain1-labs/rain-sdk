import { encodeFunctionData } from "viem";
import { TradePoolAbi } from "../../abi/TradeMarketsAbi.js";
import { CreateDisputeTxParams, CreateAppealTxParams, RawTransaction } from "../types.js";
import { getMarket, isRpcValid } from "../ClaimFunds/helpers.js";
import { getTokenAllowance } from "../CloseMarket/helpers.js";
import { buildApproveRawTx } from "../buildApprovalRawTx.js";
import { OPEN_DISPUTE } from "../../constants/contractmethods.js";
import { getDisputeAppealFee } from "./helpers.js";

async function buildOpenDisputeTxs(
    params: CreateDisputeTxParams | CreateAppealTxParams
): Promise<RawTransaction[]> {
    const {
        marketId,
        walletAddress,
        usdtTokenAddress,
        rainTokenAddress,
        usdtSymbol,
        apiUrl,
        rpcUrl,
    } = params;

    if (!apiUrl) throw new Error("Environment is not set properly, api url is missing");
    if (!rpcUrl) throw new Error("rpcUrl is required");

    const isRpcWorking = await isRpcValid(rpcUrl);
    if (!isRpcWorking) throw new Error("Provided RPC URL is not valid or not working");

    if (!marketId) throw new Error("marketId is required");
    if (!walletAddress) throw new Error("walletAddress is required");

    const { data }: any = await getMarket({ marketId, apiUrl });
    const contractAddress: `0x${string}` = data?.contractAddress;
    const marketTokenSymbol: string = data?.token?.tokenSymbol ?? "";

    if (!contractAddress) throw new Error("Market contract address not found");

    const feeAmount = await getDisputeAppealFee(contractAddress, rpcUrl);

    const isUsdtMarket = usdtSymbol ? marketTokenSymbol === usdtSymbol : false;

    const txs: RawTransaction[] = [];

    if (isUsdtMarket) {
        if (!usdtTokenAddress) throw new Error("usdtTokenAddress is required for USDT markets");
        const usdtAllowance = await getTokenAllowance(usdtTokenAddress, walletAddress, contractAddress, rpcUrl);
        if (usdtAllowance < feeAmount) {
            txs.push(buildApproveRawTx({ tokenAddress: usdtTokenAddress, spender: contractAddress, amount: feeAmount }));
        }
    } else {
        if (!rainTokenAddress) throw new Error("rainTokenAddress is required for RAIN markets");
        const rainAllowance = await getTokenAllowance(rainTokenAddress, walletAddress, contractAddress, rpcUrl);
        if (rainAllowance < feeAmount) {
            txs.push(buildApproveRawTx({ tokenAddress: rainTokenAddress, spender: contractAddress, amount: feeAmount }));
        }
    }

    txs.push({
        to: contractAddress,
        data: encodeFunctionData({
            abi: TradePoolAbi,
            functionName: OPEN_DISPUTE,
        }),
    });

    return txs;
}

export async function buildCreateDisputeRawTx(
    params: CreateDisputeTxParams
): Promise<RawTransaction[]> {
    return buildOpenDisputeTxs(params);
}

export async function buildCreateAppealRawTx(
    params: CreateAppealTxParams
): Promise<RawTransaction[]> {
    return buildOpenDisputeTxs(params);
}
