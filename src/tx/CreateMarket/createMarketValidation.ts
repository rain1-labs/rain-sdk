import { CreateMarketTxParams } from "../types.js";

export function validateCreateMarketParams(params: CreateMarketTxParams) {
    const {
        question,
        options,
        tags,
        description,
        isPublic,
        isPublicPoolResolverAi,
        creator,
        startTime,
        endTime,
        no_of_options,
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
    if (!question) throw new Error("question is required");
    if (!description) throw new Error("description is required");
    if (!Array.isArray(options) || options.length < 2 || options.length > 26) {
        throw new Error("options must be between 2 and 26");
    }
    if (options.some(opt => !opt?.toString().trim())) {
        throw new Error("options cannot contain empty values");
    }
    if (!Array.isArray(tags) || tags.length < 1 || tags.length > 3) {
        throw new Error("tags must be between 1 and 3");
    }
    if (tags.some(tag => !tag?.toString().trim())) {
        throw new Error("tags cannot contain empty values");
    }
    if (!startTime) throw new Error("startTime is required");
    if (!endTime) throw new Error("endTime is required");
    if (!no_of_options)
        throw new Error("number of options is required and cannot be empty");
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
