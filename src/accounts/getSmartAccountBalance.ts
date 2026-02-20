import { formatUnits } from 'viem';
import { ERC20Abi } from '../abi/ERC20Abi.js';
import { createRpcClient, multicallRead } from '../utils/multicall.js';
import type { GetSmartAccountBalanceParams, AccountBalanceResult, TokenBalance } from './types.js';

export async function getSmartAccountBalance(
  params: GetSmartAccountBalanceParams
): Promise<AccountBalanceResult> {
  const { address, tokenAddresses, rpcUrl } = params;

  if (!address) throw new Error('address is required');
  if (!rpcUrl) throw new Error('rpcUrl is required');

  // Fetch native ETH balance
  const client = createRpcClient(rpcUrl);
  const nativeBalance = await client.getBalance({ address });
  const formattedNativeBalance = formatUnits(nativeBalance, 18);

  // If no tokens requested, return early
  if (!tokenAddresses || tokenAddresses.length === 0) {
    return { address, nativeBalance, formattedNativeBalance, tokenBalances: [] };
  }

  // Build multicall: 3 calls per token (balanceOf, decimals, symbol)
  const contracts = tokenAddresses.flatMap((tokenAddress) => [
    { address: tokenAddress, abi: ERC20Abi, functionName: 'balanceOf' as const, args: [address] },
    { address: tokenAddress, abi: ERC20Abi, functionName: 'decimals' as const },
    { address: tokenAddress, abi: ERC20Abi, functionName: 'symbol' as const },
  ]);

  const results = await multicallRead(rpcUrl, contracts);

  // Parse results with graceful degradation
  const tokenBalances: TokenBalance[] = tokenAddresses.map((tokenAddress, i) => {
    const base = i * 3;
    const balanceResult = results[base];
    const decimalsResult = results[base + 1];
    const symbolResult = results[base + 2];

    const balance = balanceResult?.status === 'success' ? BigInt(balanceResult.result as any) : 0n;
    const decimals = decimalsResult?.status === 'success' ? Number(decimalsResult.result) : 18;
    const symbol = symbolResult?.status === 'success' ? String(symbolResult.result) : 'UNKNOWN';
    const formattedBalance = formatUnits(balance, decimals);

    return { tokenAddress, symbol, decimals, balance, formattedBalance };
  });

  return { address, nativeBalance, formattedNativeBalance, tokenBalances };
}
