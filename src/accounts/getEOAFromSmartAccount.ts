import { createRpcClient } from '../utils/multicall.js';

const OwnerAbi = [
  {
    type: 'function',
    name: 'owner',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
  },
] as const;

export async function getEOAFromSmartAccount(params: {
  smartAccountAddress: `0x${string}`;
  rpcUrl: string;
}): Promise<`0x${string}`> {
  const { smartAccountAddress, rpcUrl } = params;
  if (!smartAccountAddress) throw new Error('smartAccountAddress is required');

  const client = createRpcClient(rpcUrl);
  const owner = await client.readContract({
    address: smartAccountAddress,
    abi: OwnerAbi,
    functionName: 'owner',
  });

  return owner as `0x${string}`;
}
