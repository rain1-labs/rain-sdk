import { rain, log, assert, tryGetWalletAddress } from './helpers.js';

async function main() {
  // 1. Fetch public markets
  log('Fetching public markets (limit: 5)');
  const markets = await rain.getPublicMarkets({ limit: 5 });

  assert(Array.isArray(markets), 'getPublicMarkets should return an array');
  assert(markets.length > 0, 'getPublicMarkets should return at least 1 market');
  log('Markets returned', markets.length);

  for (const m of markets) {
    console.log(`  • [${m.status}] ${m.title} (id: ${m.id})`);
  }

  // 2. Fetch details for the first market
  const firstMarket = markets[0];
  log(`Fetching details for market: ${firstMarket.id}`);
  const details = await rain.getMarketDetails(firstMarket.id);

  assert(!!details.contractAddress, 'MarketDetails should have contractAddress');
  assert(!!details.baseToken, 'MarketDetails should have baseToken');
  assert(typeof details.numberOfOptions === 'bigint', 'numberOfOptions should be bigint');
  assert(typeof details.poolState === 'number', 'poolState should be number');
  assert(Array.isArray(details.options), 'options should be an array');

  log('MarketDetails', details);

  // 3. Fetch prices for the same market
  log(`Fetching prices for market: ${firstMarket.id}`);
  const prices = await rain.getMarketPrices(firstMarket.id);

  assert(Array.isArray(prices), 'getMarketPrices should return an array');
  assert(prices.length > 0, 'getMarketPrices should return at least 1 option price');

  for (const p of prices) {
    assert(typeof p.choiceIndex === 'number', 'choiceIndex should be a number');
    assert(typeof p.optionName === 'string', 'optionName should be a string');
    assert(typeof p.currentPrice === 'bigint', 'currentPrice should be bigint');
    console.log(`  • Option ${p.choiceIndex} "${p.optionName}": price = ${p.currentPrice}`);
  }

  log('Prices', prices);

  // 4. Fetch positions for the test wallet (or a zero-position address)
  const posAddress = tryGetWalletAddress() ?? '0x0000000000000000000000000000000000000001';
  log(`Fetching positions for ${posAddress}`);
  const positions = await rain.getPositions(posAddress as `0x${string}`);

  assert(typeof positions === 'object' && positions !== null, 'getPositions should return an object');
  assert(positions.address.toLowerCase() === posAddress.toLowerCase(), 'address should match input');
  assert(Array.isArray(positions.markets), 'markets should be an array');
  log('Positions', { address: positions.address, marketCount: positions.markets.length });

  for (const pos of positions.markets) {
    assert(typeof pos.marketId === 'string', 'marketId should be a string');
    assert(typeof pos.contractAddress === 'string', 'contractAddress should be a string');
    assert(Array.isArray(pos.options), 'options should be an array');
    assert(typeof pos.userLiquidity === 'bigint', 'userLiquidity should be bigint');
    assert(typeof pos.claimed === 'boolean', 'claimed should be boolean');
    assert(Array.isArray(pos.dynamicPayout), 'dynamicPayout should be an array');

    console.log(`  • "${pos.title}" (${pos.status}): liquidity=${pos.userLiquidity}, claimed=${pos.claimed}`);
    for (const opt of pos.options) {
      console.log(`    - Option ${opt.choiceIndex} "${opt.optionName}": shares=${opt.shares}, escrow=${opt.sharesInEscrow}, price=${opt.currentPrice}`);
    }
  }

  console.log('\n✓ test-read-markets passed');
}

main().catch((err) => {
  console.error('\n✗ test-read-markets FAILED:', err);
  process.exit(1);
});
