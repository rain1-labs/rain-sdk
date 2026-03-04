import { encodeFunctionData } from "viem";
import { TradePoolAbi } from "../../abi/TradeMarketsAbi.js";
import { CloseMarketTxParams, RawTransaction } from "../types.js";
import { getMarket, isRpcValid } from "../ClaimFunds/helpers.js";
import { buildApproveRawTx } from "../buildApprovalRawTx.js";
import { CLOSE_POOL, CHOOSE_WINNER } from "../../constants/contractmethods.js";
import { getResolverBondAmount, getTokenAllowance } from "./helpers.js";

export async function buildCloseMarketRawTx(
    params: CloseMarketTxParams
): Promise<RawTransaction[]> {
    const {
        marketId,
        walletAddress,
        proposedOutcome,
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
    const version: number = data?.version ?? 2;
    const isAiResolver: boolean = data?.isAiResolver ?? false;
    const marketTokenSymbol: string = data?.token?.tokenSymbol ?? "";

    if (!contractAddress) throw new Error("Market contract address not found");

    const txs: RawTransaction[] = [];

    if (version <= 2) {
        // V2 flow: closePool() (no args) → chooseWinner(proposedOutcome)
        if (proposedOutcome === undefined) {
            throw new Error("proposedOutcome is required for V2 markets");
        }

        if (isAiResolver) {
            // AI resolver: closePool() with no args
            txs.push({
                to: contractAddress,
                data: encodeFunctionData({
                    abi: TradePoolAbi,
                    functionName: CLOSE_POOL,
                }),
            });
        }
        else {
            txs.push({
                to: contractAddress,
                data: encodeFunctionData({
                    abi: TradePoolAbi,
                    functionName: CLOSE_POOL,
                }),
            });

            txs.push({
                to: contractAddress,
                data: encodeFunctionData({
                    abi: TradePoolAbi,
                    functionName: CHOOSE_WINNER,
                    args: [BigInt(proposedOutcome)],
                }),
            });
        }
    } else {
        // V3 flow: optional approvals → closePool() or closePool(proposedOutcome)
        const isUsdtMarket = usdtSymbol ? marketTokenSymbol === usdtSymbol : false;

        const bondAmount = await getResolverBondAmount(contractAddress, rpcUrl);

        if (isUsdtMarket) {
            // Market uses USDT — only check and approve USDT
            if (!usdtTokenAddress) throw new Error("usdtTokenAddress is required for V3 USDT markets");
            const usdtAllowance = await getTokenAllowance(usdtTokenAddress, walletAddress, contractAddress, rpcUrl);
            if (usdtAllowance < bondAmount) {
                txs.push(buildApproveRawTx({ tokenAddress: usdtTokenAddress, spender: contractAddress }));
            }
        } else {
            // Market uses RAIN — only check and approve RAIN
            if (!rainTokenAddress) throw new Error("rainTokenAddress is required for V3 RAIN markets");
            const rainAllowance = await getTokenAllowance(rainTokenAddress, walletAddress, contractAddress, rpcUrl);
            if (rainAllowance < bondAmount) {
                txs.push(buildApproveRawTx({ tokenAddress: rainTokenAddress, spender: contractAddress }));
            }
        }

        if (isAiResolver) {
            // AI resolver: closePool() with no args
            txs.push({
                to: contractAddress,
                data: encodeFunctionData({
                    abi: TradePoolAbi,
                    functionName: CLOSE_POOL,
                }),
            });
        } else {
            // Manual resolver: closePool(proposedOutcome)
            if (proposedOutcome === undefined) {
                throw new Error("proposedOutcome is required for V3 manual resolver markets");
            }
            txs.push({
                to: contractAddress,
                data: encodeFunctionData({
                    abi: TradePoolAbi,
                    functionName: CLOSE_POOL,
                    args: [BigInt(proposedOutcome)],
                }),
            });
        }
    }

    return txs;
}
