import { getPositions } from '../positions/getPositions.js';
import { getPositionByMarket } from '../positions/getPositionByMarket.js';
import { getMarketId } from '../markets/getMarketId.js';
import { getTransactions } from '../transactions/getTransactions.js';
import type { Transaction } from '../transactions/types.js';
import type { MarketPosition } from '../positions/types.js';
import type { GetPnLParams, MarketPnL, OptionPnL, PnLResult } from './types.js';

type TradeDirection = 'buy' | 'sell' | 'claim' | 'add_liquidity';

function classifyTrade(tx: Transaction, address: `0x${string}`): TradeDirection {
  const addr = address.toLowerCase();

  if (tx.type === 'buy') return 'buy';
  if (tx.type === 'claim') return 'claim';
  if (tx.type === 'add_liquidity') return 'add_liquidity';

  if (tx.type === 'limit_buy_filled') {
    // executeBuyOrders: maker = buyer, taker = seller
    if (tx.maker && tx.maker.toLowerCase() === addr) return 'buy';
    if (tx.taker && tx.taker.toLowerCase() === addr) return 'sell';
  }

  if (tx.type === 'limit_sell_filled') {
    // executeSellOrders: maker = seller, taker = buyer
    if (tx.taker && tx.taker.toLowerCase() === addr) return 'buy';
    if (tx.maker && tx.maker.toLowerCase() === addr) return 'sell';
  }

  // Fallback — shouldn't happen for the filtered types we request
  return 'buy';
}

interface OptionAccumulator {
  buyShares: bigint;
  buyCost: bigint;
  sellShares: bigint;
  sellProceeds: bigint;
}

function computeMarketPnL(
  position: MarketPosition,
  trades: Transaction[],
  address: `0x${string}`,
): MarketPnL {
  const optionCount = position.options.length;

  // Initialize per-option accumulators
  const accumulators: OptionAccumulator[] = [];
  for (let i = 0; i < optionCount; i++) {
    accumulators.push({ buyShares: 0n, buyCost: 0n, sellShares: 0n, sellProceeds: 0n });
  }

  let claimReward = 0n;
  let liquidityCost = 0n;
  let liquidityReward = 0n;

  for (const tx of trades) {
    const direction = classifyTrade(tx, address);

    if (direction === 'buy' && tx.option !== undefined && tx.option < optionCount) {
      const acc = accumulators[tx.option];
      acc.buyShares += tx.optionAmount ?? 0n;
      acc.buyCost += tx.baseAmount ?? 0n;
    } else if (direction === 'sell' && tx.option !== undefined && tx.option < optionCount) {
      const acc = accumulators[tx.option];
      acc.sellShares += tx.optionAmount ?? 0n;
      acc.sellProceeds += tx.baseAmount ?? 0n;
    } else if (direction === 'claim') {
      claimReward = tx.totalReward ?? 0n;
      liquidityReward = tx.liquidityReward ?? 0n;
    } else if (direction === 'add_liquidity') {
      liquidityCost += tx.baseAmount ?? 0n;
    }
  }

  // Compute per-option PnL
  const options: OptionPnL[] = [];
  let totalRealizedFromSells = 0n;
  let totalRemainingCostBasis = 0n;
  let totalCurrentValue = 0n;

  for (let i = 0; i < optionCount; i++) {
    const acc = accumulators[i];
    const pos = position.options[i];

    const avgCost = acc.buyShares > 0n
      ? (acc.buyCost * 1_000_000n) / acc.buyShares  // 6 decimal precision multiplier
      : 0n;

    const realizedFromSells = acc.sellProceeds - (avgCost * acc.sellShares) / 1_000_000n;
    const remainingShares = acc.buyShares - acc.sellShares;
    const remainingCostBasis = (avgCost * (remainingShares > 0n ? remainingShares : 0n)) / 1_000_000n;

    const currentValue = position.dynamicPayout[i] ?? 0n;

    totalRealizedFromSells += realizedFromSells;
    totalRemainingCostBasis += remainingCostBasis;
    totalCurrentValue += currentValue;

    let unrealizedPnL: bigint;
    if (position.claimed) {
      unrealizedPnL = 0n;
    } else {
      unrealizedPnL = currentValue - remainingCostBasis;
    }

    options.push({
      choiceIndex: pos.choiceIndex,
      optionName: pos.optionName,
      buyShares: acc.buyShares,
      buyCost: acc.buyCost,
      sellShares: acc.sellShares,
      sellProceeds: acc.sellProceeds,
      currentShares: pos.shares,
      currentValue,
      costBasis: remainingCostBasis,
      realizedPnL: realizedFromSells,
      unrealizedPnL,
    });
  }

  let realizedPnL: bigint;
  let unrealizedPnL: bigint;

  if (position.claimed) {
    const realizedFromClaim = claimReward - totalRemainingCostBasis;
    realizedPnL = totalRealizedFromSells + realizedFromClaim;
    unrealizedPnL = 0n;
  } else {
    realizedPnL = totalRealizedFromSells;
    unrealizedPnL = totalCurrentValue - totalRemainingCostBasis;
  }

  return {
    marketId: position.marketId,
    title: position.title,
    status: position.status,
    contractAddress: position.contractAddress,
    options,
    claimed: position.claimed,
    claimReward,
    liquidityCost,
    liquidityReward,
    totalCostBasis: totalRemainingCostBasis,
    totalCurrentValue,
    realizedPnL,
    unrealizedPnL,
    totalPnL: realizedPnL + unrealizedPnL,
  };
}

export async function getPnL(params: GetPnLParams): Promise<PnLResult> {
  const { address, marketAddress, subgraphUrl, subgraphApiKey, apiUrl, rpcUrl } = params;

  if (!address) throw new Error('address is required');
  if (!subgraphUrl) throw new Error('subgraphUrl is required');
  if (!apiUrl) throw new Error('apiUrl is required');
  if (!rpcUrl) throw new Error('rpcUrl is required');

  // Fetch positions and transactions in parallel
  const positionsPromise = marketAddress
    ? getMarketId({ marketAddress, apiUrl }).then((marketId) =>
        getPositionByMarket({ address, marketId, apiUrl, rpcUrl }).then((pos) => ({
          address,
          markets: [pos],
        }))
      )
    : getPositions({ address, apiUrl, rpcUrl });

  const transactionsPromise = getTransactions({
    address,
    marketAddress,
    types: ['buy', 'limit_buy_filled', 'limit_sell_filled', 'claim', 'add_liquidity'],
    first: 1000,
    orderDirection: 'asc',
    subgraphUrl,
    subgraphApiKey,
  });

  const [positionsResult, transactionsResult] = await Promise.all([
    positionsPromise,
    transactionsPromise,
  ]);

  // Group transactions by market address
  const txByMarket = new Map<string, Transaction[]>();
  for (const tx of transactionsResult.transactions) {
    const key = tx.marketAddress.toLowerCase();
    let list = txByMarket.get(key);
    if (!list) {
      list = [];
      txByMarket.set(key, list);
    }
    list.push(tx);
  }

  // Collect all market addresses we need to process (from positions + from trades)
  const positionsByAddr = new Map<string, MarketPosition>();
  for (const m of positionsResult.markets) {
    positionsByAddr.set(m.contractAddress.toLowerCase(), m);
  }

  // For markets that only appear in trades (no current position), create a stub
  for (const [marketAddr] of txByMarket) {
    if (!positionsByAddr.has(marketAddr)) {
      // We don't have position data — build a minimal stub from trade data
      const trades = txByMarket.get(marketAddr)!;
      const optionIndices = new Set<number>();
      for (const tx of trades) {
        if (tx.option !== undefined) optionIndices.add(tx.option);
      }
      const maxOption = optionIndices.size > 0 ? Math.max(...optionIndices) + 1 : 0;
      const stubOptions = [];
      for (let i = 0; i < maxOption; i++) {
        stubOptions.push({
          choiceIndex: i,
          optionName: `Option ${i}`,
          shares: 0n,
          sharesInEscrow: 0n,
          amountInEscrow: 0n,
          currentPrice: 0n,
        });
      }
      positionsByAddr.set(marketAddr, {
        marketId: '',
        title: `Market ${marketAddr.slice(0, 10)}...`,
        status: 'unknown',
        contractAddress: marketAddr as `0x${string}`,
        options: stubOptions,
        userLiquidity: 0n,
        claimed: false,
        dynamicPayout: stubOptions.map(() => 0n),
      });
    }
  }

  // Compute PnL for each market
  const markets: MarketPnL[] = [];
  let totalRealizedPnL = 0n;
  let totalUnrealizedPnL = 0n;

  for (const [marketAddr, position] of positionsByAddr) {
    const trades = txByMarket.get(marketAddr) ?? [];
    // Skip markets with no trades and no meaningful position
    if (trades.length === 0 && position.options.every((o) => o.shares === 0n)) continue;

    const marketPnL = computeMarketPnL(position, trades, address);
    markets.push(marketPnL);
    totalRealizedPnL += marketPnL.realizedPnL;
    totalUnrealizedPnL += marketPnL.unrealizedPnL;
  }

  return {
    address,
    markets,
    totalRealizedPnL,
    totalUnrealizedPnL,
    totalPnL: totalRealizedPnL + totalUnrealizedPnL,
  };
}
