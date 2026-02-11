import { CreateMarketTxParams } from "../types.js";

export function validateCreateMarketParams(params: CreateMarketTxParams) {
    const {
        isPublic,
        isPublicPoolResolverAi,
        creator,
        startTime,
        endTime,
        options,
        ipfsUrl,
        inputAmountWei,
        barValues,
        baseToken,
        factoryContractAddress,
        tokenDecimals,
    } = params;

    // Required field validations
    if (typeof isPublic !== "boolean") throw new Error("isPublic is required and must be a boolean");
    if (typeof isPublicPoolResolverAi !== "boolean")
        throw new Error("isPublicPoolResolverAi is required and must be a boolean");
    if (!creator) throw new Error("creator address is required");
    if (!startTime) throw new Error("startTime is required");
    if (!endTime) throw new Error("endTime is required");
    if (!options)
        throw new Error("number of options is required and cannot be empty");
    if (!ipfsUrl || typeof ipfsUrl !== "string") throw new Error("ipfsUrl is required");
    if (!inputAmountWei) throw new Error("inputAmountWei is required");
    if (!barValues || !Array.isArray(barValues) || barValues.length === 0)
        throw new Error("barValues array is required and cannot be empty");
    if (!baseToken) throw new Error("baseToken address is required");
    if (!factoryContractAddress) throw new Error("factoryContractAddress is required");
    const decimals = tokenDecimals ?? 6;
    const oneTokenInWei = 10n ** BigInt(decimals);
    if (inputAmountWei < oneTokenInWei * 10n) {
        throw new Error("Market cannot be opened: inputAmountWei must be at least $10");
    }
    if (startTime >= endTime) throw new Error("startTime must be earlier than endTime");

    return true;
}
