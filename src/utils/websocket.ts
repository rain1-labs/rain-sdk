import { createPublicClient, webSocket, Log, PublicClient, WebSocketTransport } from 'viem';
import { arbitrum } from 'viem/chains';
import { TradePoolAbi } from '../abi/TradeMarketsAbi.js';
import {
  WebSocketConfig,
  WebSocketReconnectConfig,
  MarketEventName,
  MarketTradeEvent,
  SubscribeMarketEventsParams,
  SubscribePriceUpdatesParams,
  PriceAffectingEventName,
  Unsubscribe,
} from '../websocket/types.js';
import { multicallRead, type MulticallResult } from './multicall.js';
import type { OptionPrice } from '../markets/types.js';

const DEFAULT_RECONNECT: WebSocketReconnectConfig = {
  attempts: 20,
  delay: 3_000,
};

export function createWsClient(config: WebSocketConfig): PublicClient<WebSocketTransport> {
  const { wsRpcUrl, reconnect = true, keepAlive = true } = config;

  let reconnectConfig: false | WebSocketReconnectConfig;
  if (reconnect === false) {
    reconnectConfig = false;
  } else if (reconnect === true) {
    reconnectConfig = DEFAULT_RECONNECT;
  } else {
    reconnectConfig = {
      attempts: reconnect.attempts ?? DEFAULT_RECONNECT.attempts,
      delay: reconnect.delay ?? DEFAULT_RECONNECT.delay,
    };
  }

  let keepAliveConfig: false | { interval: number };
  if (keepAlive === false) {
    keepAliveConfig = false;
  } else if (keepAlive === true) {
    keepAliveConfig = { interval: 30_000 };
  } else {
    keepAliveConfig = { interval: keepAlive.interval ?? 30_000 };
  }

  const transportOptions: Record<string, unknown> = {};
  if (reconnectConfig !== false) {
    transportOptions.retryCount = reconnectConfig.attempts;
    transportOptions.retryDelay = reconnectConfig.delay;
    transportOptions.reconnect = true;
  } else {
    transportOptions.reconnect = false;
  }
  if (keepAliveConfig !== false) {
    transportOptions.keepAlive = keepAliveConfig.interval;
  }

  return createPublicClient({
    chain: arbitrum,
    transport: webSocket(wsRpcUrl, transportOptions),
  }) as PublicClient<WebSocketTransport>;
}

function parseLogToMarketTradeEvent(log: Log): MarketTradeEvent {
  const eventName = (log as Log & { eventName?: string }).eventName as MarketEventName;
  const args = (log as Log & { args?: Record<string, unknown> }).args ?? {};

  return {
    eventName,
    marketAddress: log.address as `0x${string}`,
    blockNumber: log.blockNumber ?? 0n,
    transactionHash: log.transactionHash ?? ('0x' as `0x${string}`),
    logIndex: log.logIndex ?? 0,
    args,
  };
}

export function subscribeToMarketEvents(
  client: PublicClient<WebSocketTransport>,
  params: SubscribeMarketEventsParams,
): Unsubscribe {
  const { marketAddress, eventNames, onEvent, onError } = params;

  const eventNameSet = eventNames ? new Set<MarketEventName>(eventNames) : null;

  const unwatch = client.watchContractEvent({
    address: marketAddress,
    abi: TradePoolAbi,
    onLogs: (logs) => {
      for (const log of logs) {
        const parsed = parseLogToMarketTradeEvent(log);
        if (eventNameSet && !eventNameSet.has(parsed.eventName)) {
          continue;
        }
        onEvent(parsed);
      }
    },
    onError: (error) => {
      if (onError) {
        onError(error);
      }
    },
  });

  return unwatch;
}

const PRICE_AFFECTING_EVENTS: PriceAffectingEventName[] = [
  'EnterOption',
  'ExecuteBuyOrder',
  'ExecuteSellOrder',
  'Sync',
];

export function subscribePriceUpdates(
  client: PublicClient<WebSocketTransport>,
  rpcUrl: string,
  params: SubscribePriceUpdatesParams,
): Unsubscribe {
  const { marketAddress, onPriceUpdate, onError } = params;

  let cachedNumOptions: number | null = null;
  let lastFetchedBlock: bigint = 0n;
  let fetchInProgress = false;

  async function fetchPrices(triggerEvent: MarketTradeEvent): Promise<void> {
    // Debounce: skip if we already fetched for this block
    if (triggerEvent.blockNumber <= lastFetchedBlock) return;
    // Skip if a fetch is already running
    if (fetchInProgress) return;

    fetchInProgress = true;
    try {
      // On first call, read numberOfOptions alongside prices
      if (cachedNumOptions === null) {
        const numResult: readonly MulticallResult[] = await multicallRead(rpcUrl, [{
          address: marketAddress,
          abi: TradePoolAbi,
          functionName: 'numberOfOptions',
          args: [],
        }]);
        if (numResult[0]?.status !== 'success') {
          throw new Error('Failed to read numberOfOptions from contract');
        }
        cachedNumOptions = Number(numResult[0].result as bigint);
      }

      const numOptions = cachedNumOptions;
      if (numOptions === 0) {
        lastFetchedBlock = triggerEvent.blockNumber;
        onPriceUpdate({ prices: [], triggeredBy: triggerEvent });
        return;
      }

      // Multicall getCurrentPrice for each option
      const priceContracts = Array.from({ length: numOptions }, (_, i) => ({
        address: marketAddress,
        abi: TradePoolAbi,
        functionName: 'getCurrentPrice',
        args: [BigInt(i)],
      }));

      const priceResults: readonly MulticallResult[] = await multicallRead(rpcUrl, priceContracts);

      const prices: OptionPrice[] = Array.from({ length: numOptions }, (_, i) => {
        const result = priceResults[i];
        return {
          choiceIndex: i,
          optionName: `Option ${i}`,
          currentPrice: result?.status === 'success' ? BigInt(result.result as any) : 0n,
        };
      });

      lastFetchedBlock = triggerEvent.blockNumber;
      onPriceUpdate({ prices, triggeredBy: triggerEvent });
    } catch (err) {
      if (onError) {
        onError(err instanceof Error ? err : new Error(String(err)));
      }
    } finally {
      fetchInProgress = false;
    }
  }

  return subscribeToMarketEvents(client, {
    marketAddress,
    eventNames: PRICE_AFFECTING_EVENTS as MarketEventName[],
    onEvent: (event) => {
      fetchPrices(event);
    },
    onError,
  });
}
