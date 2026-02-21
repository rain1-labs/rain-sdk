import { encodeFunctionData } from 'viem';
import { TradePoolAbi } from '../abi/TradeMarketsAbi.js';
import { EnterLimitOptionTxParams, EnterOptionTxParams, RawTransaction, SellOptionTxParams } from './types.js';
import { convertToWeiEthers } from '../utils/helpers.js';
import { ENTER_OPTION, PLACE_BUY_ORDER, PLACE_SELL_ORDER } from '../constants/contractmethods.js';
export function buildEnterOptionRawTx(
    params: EnterOptionTxParams
): RawTransaction {
    const { marketContractAddress, selectedOption, buyAmountInWei } = params;

    if (!marketContractAddress) throw new Error('Market contract address is required');
    if (selectedOption === undefined) throw new Error('Selected Option is required');
    if (!buyAmountInWei) throw new Error('Buy amount is required');

    return {
        to: marketContractAddress,
        data: encodeFunctionData({
            abi: TradePoolAbi,
            functionName: ENTER_OPTION,
            args: [selectedOption, buyAmountInWei],
        }),
    };
}

export function buildLimitBuyOrderRawTx(
    params: EnterLimitOptionTxParams
): RawTransaction {

    const { marketContractAddress, selectedOption, pricePerShare, buyAmountInWei, tokenDecimals } = params;
    const decimals = tokenDecimals ?? 6;
    const oneTokenInWei = 10n ** BigInt(decimals);

    if (!marketContractAddress) {
        throw new Error("market address is required");
    }

    if (selectedOption === undefined) {
        throw new Error("selectedOption is required");
    }

    if (!pricePerShare) {
        throw new Error("price per share is required");
    }

    if (pricePerShare <= 0 || pricePerShare >= 1) {
        throw new Error("price per share should be in between 0 to 1, make sure to convert to correct decimals");
    }

    if (!buyAmountInWei) {
        throw new Error("buy amount in wei is required");
    }

    if (buyAmountInWei < oneTokenInWei) {
        throw new Error("order amount should be more then $1");
    }

    const pricePerShareInEther = convertToWeiEthers(
        pricePerShare,
        18
    );

    return {
        to: marketContractAddress,
        data: encodeFunctionData({
            abi: TradePoolAbi,
            functionName: PLACE_BUY_ORDER,
            args: [
                BigInt(selectedOption),
                pricePerShareInEther,
                buyAmountInWei,
            ],
        }),
    };
}

export function buildSellOptionRawTx(
    params: SellOptionTxParams
): RawTransaction {

    const { marketContractAddress, selectedOption, pricePerShare, shares } = params;

    if (!marketContractAddress) {
        throw new Error("market address is required");
    }

    if (selectedOption === undefined) {
        throw new Error("selectedOption is required");
    }

    if (!pricePerShare) {
        throw new Error("price per share is required");
    }

    if (pricePerShare <= 0 || pricePerShare >= 1) {
        throw new Error("price per share should be in between 0 to 1, make sure to convert to correct decimals");
    }

    if (!shares || shares <= 0n) {
        throw new Error("shares must be greater than 0");
    }

    const pricePerShareInEther = convertToWeiEthers(
        pricePerShare.toString(),
        18
    );

    return {
        to: marketContractAddress,
        data: encodeFunctionData({
            abi: TradePoolAbi,
            functionName: PLACE_SELL_ORDER,
            args: [
                BigInt(selectedOption),
                pricePerShareInEther,
                shares,
            ],
        }),
    };
}
