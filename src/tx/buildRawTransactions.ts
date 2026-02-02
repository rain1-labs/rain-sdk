import { encodeFunctionData } from 'viem';
import { TradePoolAbi } from '../abi/TradeMarketsAbi';
import { EnterOptionTxParams, RawTransaction } from './types';

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
            functionName: 'enterOption',
            args: [selectedOption, buyAmountInWei],
        }),
    };
}
