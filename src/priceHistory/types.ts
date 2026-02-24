export type PriceHistoryInterval = '1m' | '5m' | '15m' | '1h' | '4h' | '1d' | '1w';

export interface PricePoint {
  timestamp: bigint;
  price: bigint;          // Derived price (scaled to 18 decimals)
  volume: bigint;         // baseAmount for this trade
  option: number;
}

export interface PriceCandle {
  timestamp: bigint;      // Period start (unix seconds)
  open: bigint;
  high: bigint;
  low: bigint;
  close: bigint;
  volume: bigint;         // Sum of baseAmount in period
  trades: number;         // Number of trades in period
}

export interface PriceHistoryResult {
  marketId: string;
  marketAddress: `0x${string}`;
  optionIndex: number;
  interval: PriceHistoryInterval;
  candles: PriceCandle[];
}

export interface GetPriceHistoryParams {
  marketId: string;
  optionIndex: number;
  interval: PriceHistoryInterval;
  from?: bigint;          // Start timestamp filter
  to?: bigint;            // End timestamp filter
  limit?: number;         // Max candles (default 200)
  subgraphUrl: string;
  apiUrl: string;
}
