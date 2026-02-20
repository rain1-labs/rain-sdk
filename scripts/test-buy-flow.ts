import { rain, walletClient, publicClient, walletAddress, log, assert, waitForTx, erc20BalanceOfAbi } from './helpers.js';

const BUY_AMOUNT = 1_000_000n; // 1 USDT (6 decimals)

async function main() {
  // 1. Fetch a live market
  log('Fetching a live market');
  const markets = await rain.getPublicMarkets({ limit: 10 });
  assert(markets.length > 0, 'Need at least 1 market');

  // Prefer a "Live" or "Trading" market if available
  const liveMarket = markets.find((m) => m.status === 'Live' || m.status === 'Trading') ?? markets[0];
  const details = await rain.getMarketDetails(liveMarket.id);
  log('Using market', { id: details.id, title: details.title, status: details.status, contractAddress: details.contractAddress });

  const contractAddress = details.contractAddress;
  const baseToken = details.baseToken;

  // 2. Check wallet balance
  log(`Checking USDT balance for ${walletAddress}`);
  const balance = await publicClient.readContract({
    address: baseToken,
    abi: erc20BalanceOfAbi,
    functionName: 'balanceOf',
    args: [walletAddress],
  });

  log('Balance', { baseToken, balance: balance.toString(), required: BUY_AMOUNT.toString() });
  if (balance < BUY_AMOUNT) {
    console.error(`Insufficient balance: have ${balance}, need ${BUY_AMOUNT}. Fund the wallet and retry.`);
    process.exit(1);
  }

  // 3. Build and send approval tx
  log('Building approval tx');
  const approvalResult = rain.buildApprovalTx({
    tokenAddress: baseToken,
    spender: contractAddress,
    amount: BUY_AMOUNT,
  });
  assert(!(approvalResult instanceof Error), `buildApprovalTx error: ${approvalResult}`);

  log('Sending approval tx');
  const approveHash = await walletClient.sendTransaction({
    to: approvalResult.to,
    data: approvalResult.data,
    chain: walletClient.chain,
    account: walletClient.account!,
  });
  await waitForTx(approveHash);

  // 4. Build and send buy option tx
  log('Building buy option tx');
  const buyTx = rain.buildBuyOptionRawTx({
    marketContractAddress: contractAddress,
    selectedOption: 0n,
    buyAmountInWei: BUY_AMOUNT,
  });

  log('Sending buy option tx');
  const buyHash = await walletClient.sendTransaction({
    to: buyTx.to,
    data: buyTx.data,
    value: buyTx.value,
    chain: walletClient.chain,
    account: walletClient.account!,
  });
  await waitForTx(buyHash);

  console.log('\n✓ test-buy-flow passed — successfully bought option 0 on market', details.id);
}

main().catch((err) => {
  console.error('\n✗ test-buy-flow FAILED:', err);
  process.exit(1);
});
