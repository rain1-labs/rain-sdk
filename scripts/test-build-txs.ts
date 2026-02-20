import { rain, log, assert } from './helpers.js';

async function main() {
  // 1. Fetch a live market to get real addresses
  log('Fetching a market for tx building');
  const markets = await rain.getPublicMarkets({ limit: 1 });
  assert(markets.length > 0, 'Need at least 1 market');

  const details = await rain.getMarketDetails(markets[0].id);
  log('Using market', { id: details.id, title: details.title, contractAddress: details.contractAddress, baseToken: details.baseToken });

  const contractAddress = details.contractAddress;
  const baseToken = details.baseToken;

  // 2. Build approval tx
  log('Building approval tx');
  const approvalResult = rain.buildApprovalTx({
    tokenAddress: baseToken,
    spender: contractAddress,
    amount: 1_000_000n, // 1 USDT
  });

  assert(!(approvalResult instanceof Error), `buildApprovalTx returned error: ${approvalResult}`);
  const approvalTx = approvalResult;
  assert(approvalTx.to.toLowerCase() === baseToken.toLowerCase(), 'Approval tx "to" should be the base token');
  assert(approvalTx.data.startsWith('0x'), 'Approval tx should have hex data');
  // approve selector = 0x095ea7b3
  assert(approvalTx.data.startsWith('0x095ea7b3'), 'Approval tx data should start with approve selector');
  log('Approval tx', approvalTx);

  // 3. Build buy option tx
  log('Building buy option tx');
  const buyTx = rain.buildBuyOptionRawTx({
    marketContractAddress: contractAddress,
    selectedOption: 0n,
    buyAmountInWei: 1_000_000n, // 1 USDT
  });

  assert(buyTx.to.toLowerCase() === contractAddress.toLowerCase(), 'Buy tx "to" should be the market contract');
  assert(buyTx.data.startsWith('0x'), 'Buy tx should have hex data');
  log('Buy option tx', buyTx);

  // 4. Build limit buy tx
  log('Building limit buy option tx');
  const limitTx = rain.buildLimitBuyOptionTx({
    marketContractAddress: contractAddress,
    selectedOption: 0,
    pricePerShare: 500_000n, // 0.50 USDT per share
    buyAmountInWei: 1_000_000n, // 1 USDT total
  });

  assert(limitTx.to.toLowerCase() === contractAddress.toLowerCase(), 'Limit tx "to" should be the market contract');
  assert(limitTx.data.startsWith('0x'), 'Limit tx should have hex data');
  log('Limit buy option tx', limitTx);

  console.log('\n✓ test-build-txs passed');
}

main().catch((err) => {
  console.error('\n✗ test-build-txs FAILED:', err);
  process.exit(1);
});
