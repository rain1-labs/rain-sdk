import { GetMarketsParams, Market } from './markets/types';
import { getMarkets } from './markets/getMarkets';
import { ApproveTxParams, EnterOptionTxParams, RawTransaction } from './tx/types';
import { buildEnterOptionRawTx } from './tx/buildRawTransactions';
import { buildApproveRawTx } from './tx/buildApprovalRawTx';

export class Rain {

  async getPublicMarkets(params: GetMarketsParams): Promise<Market[]> {
    return getMarkets(params);
  }

  buildApprovalTx(params: ApproveTxParams): RawTransaction | Error {
    return buildApproveRawTx(params);
  }

  buildBuyOptionRawTx(params: EnterOptionTxParams): RawTransaction {
    return buildEnterOptionRawTx(params);
  }

}
