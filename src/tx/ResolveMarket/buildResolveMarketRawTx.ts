import { encodeFunctionData } from "viem";
import { TradePoolAbi } from "../../abi/TradeMarketsAbi.js";
import { CloseMarketTxParams, ChooseWinnerTxParams, ResolveMarketTxParams, RawTransaction } from "../types.js";
import { getMarket, isRpcValid } from "../ClaimFunds/helpers.js";
import { MARKET_STATUS } from "../../markets/constants.js";
import { CLOSE_POOL, CHOOSE_WINNER } from "../../constants/contractmethods.js";

export async function buildCloseMarketRawTx(params: CloseMarketTxParams): Promise<RawTransaction> {
    const { marketId, apiUrl, rpcUrl } = params;
    if (!apiUrl) { throw new Error("Environment is not set properly, api url is missing"); }
    const isRpcWorking = await isRpcValid(rpcUrl);
    if (!rpcUrl || !isRpcWorking) { throw new Error("Provided RPC URL is not valid or not working"); }
    if (!marketId) { throw new Error("marketId is required"); }

    const { data }: any = await getMarket({ marketId, apiUrl });
    if (data?.status === MARKET_STATUS.Closed) {
        throw new Error("Market is already closed");
    }

    const marketContractAddress = data?.contractAddress;
    return {
        to: marketContractAddress,
        data: encodeFunctionData({
            abi: TradePoolAbi,
            functionName: CLOSE_POOL,
        }),
    };
}

export async function buildChooseWinnerRawTx(params: ChooseWinnerTxParams): Promise<RawTransaction> {
    const { marketId, winningOption, apiUrl, rpcUrl } = params;
    if (!apiUrl) { throw new Error("Environment is not set properly, api url is missing"); }
    const isRpcWorking = await isRpcValid(rpcUrl);
    if (!rpcUrl || !isRpcWorking) { throw new Error("Provided RPC URL is not valid or not working"); }
    if (!marketId) { throw new Error("marketId is required"); }
    if (!winningOption || winningOption < 1) { throw new Error("winningOption must be a positive number (1-indexed)"); }

    const { data }: any = await getMarket({ marketId, apiUrl });
    const options = data?.options || [];
    if (winningOption > options.length) {
        throw new Error(`winningOption ${winningOption} is out of bounds. Market has ${options.length} options.`);
    }

    const marketContractAddress = data?.contractAddress;
    return {
        to: marketContractAddress,
        data: encodeFunctionData({
            abi: TradePoolAbi,
            functionName: CHOOSE_WINNER,
            args: [BigInt(winningOption)],
        }),
    };
}

export async function buildResolveMarketRawTx(params: ResolveMarketTxParams): Promise<RawTransaction[]> {
    const { marketId, winningOption, apiUrl, rpcUrl } = params;
    if (!apiUrl) { throw new Error("Environment is not set properly, api url is missing"); }
    const isRpcWorking = await isRpcValid(rpcUrl);
    if (!rpcUrl || !isRpcWorking) { throw new Error("Provided RPC URL is not valid or not working"); }
    if (!marketId) { throw new Error("marketId is required"); }
    if (!winningOption || winningOption < 1) { throw new Error("winningOption must be a positive number (1-indexed)"); }

    const { data }: any = await getMarket({ marketId, apiUrl });
    const options = data?.options || [];
    if (winningOption > options.length) {
        throw new Error(`winningOption ${winningOption} is out of bounds. Market has ${options.length} options.`);
    }

    const marketContractAddress = data?.contractAddress;
    const txs: RawTransaction[] = [];

    // Only include closePool if the market is not already finalized/closed
    if (data?.status !== MARKET_STATUS.Closed) {
        txs.push({
            to: marketContractAddress,
            data: encodeFunctionData({
                abi: TradePoolAbi,
                functionName: CLOSE_POOL,
            }),
        });
    }

    txs.push({
        to: marketContractAddress,
        data: encodeFunctionData({
            abi: TradePoolAbi,
            functionName: CHOOSE_WINNER,
            args: [BigInt(winningOption)],
        }),
    });

    return txs;
}
