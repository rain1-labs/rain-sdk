import { Contract, JsonRpcProvider } from "ethers";
import { Market } from "../../markets/types.js";
import { GetUserOptionSharesParams } from "../types.js";
import { TradePoolAbi } from "../../abi/TradeMarketsAbi.js";

export async function getMarket(
    params: { marketId: string; apiUrl: string }
): Promise<Market> {
    if (!params?.apiUrl) { throw new Error("Environemnt is not set properly, api url is missing") }
    const res = await fetch(`${params.apiUrl}/pools/pool/${params.marketId}`);
    if (!res.ok) {
        throw new Error(`Failed to fetch markets: ${res.status}`);
    }

    const data = await res.json();
    return data;
}

export async function isRpcValid(rpcUrl: string | undefined): Promise<boolean> {
    if (!rpcUrl) return false;
    const provider = new JsonRpcProvider(rpcUrl);
    try {
        await provider.getNetwork();
        return true;
    } catch (error) {
        return false;
    }
}

export async function getUserOptionShares(
    params: GetUserOptionSharesParams
): Promise<number[]> {
    const { marketContractAddress, options, walletAddress, rpcUrl } = params
    const provider = new JsonRpcProvider(rpcUrl);
    const userShares: number[] = [];
    for (let i = 0; i < options.length; i++) {
        const choiceIndex = options[i].choiceIndex;
        const contract = new Contract(marketContractAddress, TradePoolAbi, provider);
        const userVotes = await contract.userVotes(choiceIndex, walletAddress)
        Number(userVotes) > 0 && userShares.push(Number(userVotes))
    }
    return userShares
}