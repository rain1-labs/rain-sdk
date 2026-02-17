import { ethers, JsonRpcProvider, Contract } from "ethers";
import { CreateMarketTxParams } from "../tx/types.js";
import { ERC20Abi } from "../abi/ERC20Abi.js";

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
    const provider = new JsonRpcProvider(rpcUrl);
    const contract = new Contract(baseToken, ERC20Abi, provider);
    const userAllowance = await contract.allowance(creator, factoryContractAddress)
    return userAllowance
}