import { ethers, JsonRpcProvider, Contract } from "ethers";
import { CreateMarketTxParams } from "../tx/types.js";
import { ERC20Abi } from "../abi/ERC20Abi.js";
import { isRpcValid } from "../tx/ClaimFunds/helpers.js";

export const convertToWeiEthers = (
    value: string | bigint,
    decimals: number
): bigint => {
    return ethers.parseUnits(value.toString(), decimals);
};

export async function getUserAllownace(
    params: CreateMarketTxParams
): Promise<number> {
    const { factoryContractAddress, baseToken, creator, rpcUrl } = params
    const isRpcWorking = await isRpcValid(rpcUrl)
    if (!rpcUrl || !isRpcWorking) { throw new Error("Provided RPC URL is not valid or not working") }
    const provider = new JsonRpcProvider(rpcUrl);
    const ERC20ApprovalContract = new Contract(baseToken, ERC20Abi, provider);
    const userAllowance = await ERC20ApprovalContract.allowance(creator, factoryContractAddress)
    return userAllowance
}