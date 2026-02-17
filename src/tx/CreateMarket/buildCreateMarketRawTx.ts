import { encodeFunctionData } from "viem";
import { CreateMarketTxParams, RawTransaction } from "../types.js";
import { CreateMarketAbi } from "../../abi/CreateMarketAbi.js";
import { CREATE_MARKET } from "../../constants/contractmethods.js";
import { validateCreateMarketParams } from "./createMarketValidation.js";
import { normalizeBarValues, uploadMetaData } from "./helpers.js";
import { getUserAllownace } from "../../utils/helpers.js";
import { buildApproveRawTx } from "../buildApprovalRawTx.js";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

export async function buildCreateMarketRawTx(
    params: CreateMarketTxParams
): Promise<RawTransaction[]> {
    const {
        isPublic,
        isPublicPoolResolverAi,
        creator,
        startTime,
        endTime,
        no_of_options,
        disputeTimer,
        inputAmountWei,
        barValues,
        baseToken,
        factoryContractAddress,
    } = params;
    if (!factoryContractAddress) throw new Error("environment is not set correctly, factory contract address is missing");
    const allowance = await getUserAllownace(params);
    const createMarketTransactions: RawTransaction[] = [];
    if (BigInt(allowance) < BigInt(inputAmountWei)) {
        const approveTx = buildApproveRawTx({ spender: factoryContractAddress, tokenAddress: baseToken })
        createMarketTransactions.push(approveTx);
    }
    validateCreateMarketParams(params);
    const normalizeBarValue = normalizeBarValues(barValues);
    const ipfsUrl = await uploadMetaData(params);

    const createMarketParams = [
        isPublic,
        isPublicPoolResolverAi,
        creator,
        ZERO_ADDRESS,
        startTime,
        endTime,
        no_of_options,
        disputeTimer,
        ipfsUrl,
        inputAmountWei,
        normalizeBarValue,
        creator,
        baseToken,
    ] as any;

    createMarketTransactions.push({
        to: factoryContractAddress,
        data: encodeFunctionData({
            abi: CreateMarketAbi,
            functionName: CREATE_MARKET,
            args: [createMarketParams],
        }),
        value: 0n,
    });

    return createMarketTransactions;
}
