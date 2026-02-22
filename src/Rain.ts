import { PublicClient, WebSocketTransport } from 'viem';
import { GetMarketsParams, Market, MarketDetails, MarketLiquidity, MarketVolume, OptionPrice } from './markets/types.js';
import { getMarkets } from './markets/getMarkets.js';
import { getMarketDetails } from './markets/getMarketDetails.js';
import { getMarketPrices } from './markets/getMarketPrices.js';
import { getMarketVolume } from './markets/getMarketVolume.js';
import { getMarketLiquidity } from './markets/getMarketLiquidity.js';
import { ApproveTxParams, CancelOrdersTxParams, ClaimTxParams, CloseMarketTxParams, ChooseWinnerTxParams, ResolveMarketTxParams, CreateMarketTxParams, DepositToSmartAccountTxParams, EnterLimitOptionTxParams, EnterOptionTxParams, RawTransaction, SellOptionTxParams, WithdrawFromSmartAccountTxParams } from './tx/types.js';
import { buildEnterOptionRawTx, buildLimitBuyOrderRawTx, buildSellOptionRawTx, buildCancelBuyOrdersRawTx, buildCancelSellOrdersRawTx } from './tx/buildRawTransactions.js';
import { buildApproveRawTx } from './tx/buildApprovalRawTx.js';
import { buildCreateMarketRawTx } from './tx/CreateMarket/buildCreateMarketRawTx.js';
import { RainCoreConfig, RainEnvironment } from './types.js';
import { ALLOWED_ENVIRONMENTS, ENV_CONFIG, getRandomRpc } from './config/environments.js';
import { buildClaimRawTx } from './tx/ClaimFunds/buildClaimFundsRawTx.js';
import { buildCloseMarketRawTx, buildChooseWinnerRawTx, buildResolveMarketRawTx } from './tx/ResolveMarket/buildResolveMarketRawTx.js';
import { buildTransferRawTx } from './tx/buildTransferRawTx.js';
import { AccountBalanceResult } from './accounts/types.js';
import { getSmartAccountBalance } from './accounts/getSmartAccountBalance.js';
import { getEOAFromSmartAccount } from './accounts/getEOAFromSmartAccount.js';
import { PositionByMarket, PositionsResult } from './positions/types.js';
import { getPositions } from './positions/getPositions.js';
import { getPositionByMarket } from './positions/getPositionByMarket.js';
import { GetTransactionsParams, GetTransactionDetailsParams, GetMarketTransactionsParams, GetTradeHistoryParams, TransactionsResult, TransactionDetails, MarketTransactionsResult, TradeHistoryResult } from './transactions/types.js';
import { getTransactions } from './transactions/getTransactions.js';
import { getTransactionDetails } from './transactions/getTransactionDetails.js';
import { getMarketTransactions } from './transactions/getMarketTransactions.js';
import { getTradeHistory } from './transactions/getTradeHistory.js';
import { createWsClient, subscribeToMarketEvents } from './utils/websocket.js';
import { SubscribeMarketEventsParams, Unsubscribe } from './websocket/types.js';

export class Rain {

  public readonly environment: RainEnvironment;
  private readonly marketFactory: `0x${string}`;
  private readonly apiUrl: string;
  private readonly distute_initial_timer: number;
  private readonly rpcUrl?: string;
  private readonly subgraphUrl?: string;
  private readonly wsRpcUrl?: string;
  private readonly wsReconnect?: boolean | { attempts?: number; delay?: number };
  private wsClient: PublicClient<WebSocketTransport> | null = null;

  constructor(config: RainCoreConfig = {}) {
    const { environment = "development", rpcUrl, apiUrl, subgraphUrl, wsRpcUrl, wsReconnect } = config;

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
    this.subgraphUrl = subgraphUrl;
    this.wsRpcUrl = wsRpcUrl;
    this.wsReconnect = wsReconnect;
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

  buildSellOptionTx(params: SellOptionTxParams): RawTransaction {
    return buildSellOptionRawTx(params);
  }

  buildCancelBuyOrdersTx(params: CancelOrdersTxParams): RawTransaction {
    return buildCancelBuyOrdersRawTx(params);
  }

  buildCancelSellOrdersTx(params: CancelOrdersTxParams): RawTransaction {
    return buildCancelSellOrdersRawTx(params);
  }

  buildCreateMarketTx(params: CreateMarketTxParams): Promise<RawTransaction[]> {
    return buildCreateMarketRawTx({ ...params, factoryContractAddress: this.marketFactory, apiUrl: this.apiUrl, rpcUrl: this.rpcUrl, disputeTimer: this.distute_initial_timer });
  }

  async buildClaimTx(params: ClaimTxParams): Promise<RawTransaction> {
    return buildClaimRawTx({ ...params, apiUrl: this.apiUrl, rpcUrl: this.rpcUrl });
  }

  async buildCloseMarketTx(params: CloseMarketTxParams): Promise<RawTransaction> {
    return buildCloseMarketRawTx({ ...params, apiUrl: this.apiUrl, rpcUrl: this.rpcUrl });
  }

  async buildChooseWinnerTx(params: ChooseWinnerTxParams): Promise<RawTransaction> {
    return buildChooseWinnerRawTx({ ...params, apiUrl: this.apiUrl, rpcUrl: this.rpcUrl });
  }

  async buildResolveMarketTx(params: ResolveMarketTxParams): Promise<RawTransaction[]> {
    return buildResolveMarketRawTx({ ...params, apiUrl: this.apiUrl, rpcUrl: this.rpcUrl });
  }

  buildDepositToSmartAccountTx(params: DepositToSmartAccountTxParams): RawTransaction {
    return buildTransferRawTx({
      tokenAddress: params.tokenAddress,
      recipient: params.smartAccountAddress,
      amount: params.amount,
    });
  }

  buildWithdrawFromSmartAccountTx(params: WithdrawFromSmartAccountTxParams): RawTransaction {
    return buildTransferRawTx({
      tokenAddress: params.tokenAddress,
      recipient: params.eoaAddress,
      amount: params.amount,
    });
  }

  async getMarketDetails(marketId: string): Promise<MarketDetails> {
    return getMarketDetails({ marketId, apiUrl: this.apiUrl, rpcUrl: this.rpcUrl! });
  }

  async getMarketPrices(marketId: string): Promise<OptionPrice[]> {
    return getMarketPrices({ marketId, apiUrl: this.apiUrl, rpcUrl: this.rpcUrl! });
  }

  async getMarketVolume(marketId: string): Promise<MarketVolume> {
    return getMarketVolume({ marketId, apiUrl: this.apiUrl, rpcUrl: this.rpcUrl! });
  }

  async getMarketLiquidity(marketId: string): Promise<MarketLiquidity> {
    return getMarketLiquidity({ marketId, apiUrl: this.apiUrl, rpcUrl: this.rpcUrl! });
  }

  async getSmartAccountBalance(params: {
    address: `0x${string}`;
    tokenAddresses: `0x${string}`[];
  }): Promise<AccountBalanceResult> {
    return getSmartAccountBalance({ ...params, rpcUrl: this.rpcUrl! });
  }

  async getEOAFromSmartAccount(smartAccountAddress: `0x${string}`): Promise<`0x${string}`> {
    return getEOAFromSmartAccount({ smartAccountAddress, rpcUrl: this.rpcUrl! });
  }

  async getPositions(address: `0x${string}`): Promise<PositionsResult> {
    return getPositions({ address, apiUrl: this.apiUrl, rpcUrl: this.rpcUrl! });
  }

  async getPositionByMarket(address: `0x${string}`, marketId: string): Promise<PositionByMarket> {
    return getPositionByMarket({ address, marketId, apiUrl: this.apiUrl, rpcUrl: this.rpcUrl! });
  }

  async getTransactions(params: Omit<GetTransactionsParams, 'subgraphUrl'> & { subgraphUrl?: string }): Promise<TransactionsResult> {
    const subgraphUrl = params.subgraphUrl ?? this.subgraphUrl;
    if (!subgraphUrl) {
      throw new Error('subgraphUrl is required — pass it in the Rain constructor config or in the method params');
    }
    return getTransactions({ ...params, subgraphUrl });
  }

  async getTransactionDetails(
    params: Omit<GetTransactionDetailsParams, 'subgraphUrl' | 'rpcUrl'> & { subgraphUrl?: string; rpcUrl?: string }
  ): Promise<TransactionDetails> {
    const subgraphUrl = params.subgraphUrl ?? this.subgraphUrl;
    const rpcUrl = params.rpcUrl ?? this.rpcUrl;
    if (!subgraphUrl) {
      throw new Error('subgraphUrl is required — pass it in the Rain constructor config or in the method params');
    }
    if (!rpcUrl) {
      throw new Error('rpcUrl is required — pass it in the Rain constructor config or in the method params');
    }
    return getTransactionDetails({ ...params, subgraphUrl, rpcUrl });
  }

  async getMarketTransactions(
    params: Omit<GetMarketTransactionsParams, 'subgraphUrl'> & { subgraphUrl?: string }
  ): Promise<MarketTransactionsResult> {
    const subgraphUrl = params.subgraphUrl ?? this.subgraphUrl;
    if (!subgraphUrl) {
      throw new Error('subgraphUrl is required — pass it in the Rain constructor config or in the method params');
    }
    return getMarketTransactions({ ...params, subgraphUrl });
  }

  async getTradeHistory(
    params: Omit<GetTradeHistoryParams, 'subgraphUrl'> & { subgraphUrl?: string }
  ): Promise<TradeHistoryResult> {
    const subgraphUrl = params.subgraphUrl ?? this.subgraphUrl;
    if (!subgraphUrl) {
      throw new Error('subgraphUrl is required — pass it in the Rain constructor config or in the method params');
    }
    return getTradeHistory({ ...params, subgraphUrl });
  }

  private getWsClient(): PublicClient<WebSocketTransport> {
    if (this.wsClient) {
      return this.wsClient;
    }
    if (!this.wsRpcUrl) {
      throw new Error(
        'wsRpcUrl is required for WebSocket subscriptions — pass it in the Rain constructor config'
      );
    }
    this.wsClient = createWsClient({
      wsRpcUrl: this.wsRpcUrl,
      reconnect: this.wsReconnect,
    });
    return this.wsClient;
  }

  subscribeToMarketEvents(params: SubscribeMarketEventsParams): Unsubscribe {
    const client = this.getWsClient();
    return subscribeToMarketEvents(client, params);
  }

  async destroyWebSocket(): Promise<void> {
    if (this.wsClient) {
      const transport = this.wsClient.transport;
      if ('getSocket' in transport && typeof transport.getSocket === 'function') {
        try {
          const socket = await (transport.getSocket as () => Promise<WebSocket>)();
          socket.close();
        } catch {
          // Socket may already be closed
        }
      }
      this.wsClient = null;
    }
  }

}
