import { createPublicClient, http, type ContractFunctionParameters } from 'viem';
import { arbitrum } from 'viem/chains';

export type MulticallResult = { result?: unknown; error?: Error; status: 'success' | 'failure' };

export function createRpcClient(rpcUrl: string) {
  return createPublicClient({
    chain: arbitrum,
    transport: http(rpcUrl),
  });
}

export async function multicallRead(
  rpcUrl: string,
  contracts: ContractFunctionParameters[],
): Promise<readonly MulticallResult[]> {
  const client = createRpcClient(rpcUrl);
  return client.multicall({ contracts: contracts as any }) as Promise<readonly MulticallResult[]>;
}
