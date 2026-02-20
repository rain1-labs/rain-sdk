import { GetMarketsParams, Market, MarketDetails } from './markets/types.js';
import { getMarkets } from './markets/getMarkets.js';
import { getMarketDetails } from './markets/getMarketDetails.js';
import { ApproveTxParams, ClaimTxParams, CreateMarketTxParams, EnterLimitOptionTxParams, EnterOptionTxParams, RawTransaction } from './tx/types.js';
import { buildEnterOptionRawTx, buildLimitBuyOrderRawTx } from './tx/buildRawTransactions.js';
import { buildApproveRawTx } from './tx/buildApprovalRawTx.js';
import { buildCreateMarketRawTx } from './tx/CreateMarket/buildCreateMarketRawTx.js';
import { RainCoreConfig, RainEnvironment } from './types.js';
import { ALLOWED_ENVIRONMENTS, ENV_CONFIG, getRandomRpc } from './config/environments.js';
import { buildClaimRawTx } from './tx/ClaimFunds/buildClaimFundsRawTx.js';

export class Rain {

  public readonly environment: RainEnvironment;
  private readonly marketFactory: `0x${string}`;
  private readonly apiUrl: string;
  private readonly distute_initial_timer: number;
  private readonly rpcUrl?: string;

  constructor(config: RainCoreConfig = {}) {
    const { environment = "development", rpcUrl, apiUrl } = config;

    function isValidEnvironment(env: string): env is RainEnvironment {
      return ALLOWED_ENVIRONMENTS.includes(env as RainEnvironment);
    }

    if (!isValidEnvironment(environment)) {
      throw new Error(
        `Invalid environment "${environment}". Allowed values: ${ALLOWED_ENVIRONMENTS.join(", ")}`
      );
    }
    this.environment = environment;
    this.rpcUrl = rpcUrl ?? getRandomRpc();
    const envConfig = ENV_CONFIG[this.environment];
    this.marketFactory = envConfig.market_factory_address
    this.apiUrl = apiUrl ?? envConfig.apiUrl;
    this.distute_initial_timer = envConfig.dispute_initial_timer;
  }

  async getPublicMarkets(params: GetMarketsParams): Promise<Market[]> {
    return getMarkets({ ...params, apiUrl: this.apiUrl });
  }

  buildApprovalTx(params: ApproveTxParams): RawTransaction | Error {
    return buildApproveRawTx(params);
  }

  buildBuyOptionRawTx(params: EnterOptionTxParams): RawTransaction {
    return buildEnterOptionRawTx(params);
  }

  buildLimitBuyOptionTx(
    params: EnterLimitOptionTxParams
  ): RawTransaction {
    return buildLimitBuyOrderRawTx(params);
  }

  buildCreateMarketTx(params: CreateMarketTxParams): Promise<RawTransaction[]> {
    return buildCreateMarketRawTx({ ...params, factoryContractAddress: this.marketFactory, apiUrl: this.apiUrl, rpcUrl: this.rpcUrl, disputeTimer: this.distute_initial_timer });
  }

  async buildClaimTx(params: ClaimTxParams): Promise<RawTransaction> {
    return buildClaimRawTx({ ...params, apiUrl: this.apiUrl, rpcUrl: this.rpcUrl });
  }

  async getMarketDetails(marketId: string): Promise<MarketDetails> {
    return getMarketDetails({ marketId, apiUrl: this.apiUrl, rpcUrl: this.rpcUrl! });
  }

}
