import { rain, log, assert } from './helpers.js';

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

  console.log('\n✓ test-read-markets passed');
}

main().catch((err) => {
  console.error('\n✗ test-read-markets FAILED:', err);
  process.exit(1);
});
