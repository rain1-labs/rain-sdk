import { getTransactions } from './getTransactions.js';
import { GetTradeHistoryParams, TradeHistoryResult } from './types.js';

export async function getTradeHistory(params: GetTradeHistoryParams): Promise<TradeHistoryResult> {
  const { address, marketAddress, ...rest } = params;

  const result = await getTransactions({
    address,
    marketAddress,
    ...rest,
  });

  return {
    address,
    marketAddress,
    transactions: result.transactions,
    total: result.total,
  };
}
