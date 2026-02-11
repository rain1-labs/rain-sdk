import { encodeFunctionData } from "viem";
import { CreateMarketTxParams, RawTransaction } from "../types.js";
import { CreateMarketAbi } from "../../abi/CreateMarketAbi.js";
import { CREATE_MARKET } from "../../constants/contractmethods.js";
import { validateCreateMarketParams } from "./createMarketValidation.js";
import { normalizeBarValues } from "./helpers.js";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

export function buildCreateMarketRawTx(
    params: CreateMarketTxParams
): RawTransaction {
    const {
        isPublic,
        isPublicPoolResolverAi,
        creator,
        startTime,
        endTime,
        options,
        disputeTimer,
        ipfsUrl,
        inputAmountWei,
        barValues,
        baseToken,
        factoryContractAddress,
    } = params;
    if (!factoryContractAddress) throw new Error("environment is not set correctly, factory contract address is missing");
    validateCreateMarketParams(params);
    const normalizeBarValue = normalizeBarValues(barValues);

    const createMarketParams = [
        isPublic,
        isPublicPoolResolverAi,
        creator,
        ZERO_ADDRESS,
        startTime,
        endTime,
        options,
        disputeTimer,
        ipfsUrl,
        inputAmountWei,
        normalizeBarValue,
        creator,
        baseToken,
    ] as any;

    return {
        to: factoryContractAddress,
        data: encodeFunctionData({
            abi: CreateMarketAbi,
            functionName: CREATE_MARKET,
            args: [createMarketParams],
        }),
    };
}
