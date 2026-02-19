import { CreateMarketTxParams } from '../../src/tx/types.js';

export const ADDR_ALICE = '0xaAaAaAaaAaAaAaaAaAAAAAAAAaaaAaAaAaaAaaAa' as const;
export const ADDR_BOB = '0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB' as const;
export const ADDR_TOKEN = '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9' as const; // USDT on Arb
export const ADDR_FACTORY = '0x148DA7F2039B2B00633AC2ab566f59C8a4C86313' as const;
export const ADDR_MARKET = '0x1111111111111111111111111111111111111111' as const;
export const ADDR_ZERO = '0x0000000000000000000000000000000000000000' as const;
export const RPC_URL = 'https://arb1.arbitrum.io/rpc' as const;

export const ERC20_BALANCE_OF_ABI = [
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

export const ERC20_DECIMALS_ABI = [
  {
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

export function makeMulticallContracts() {
  return [
    {
      address: ADDR_TOKEN,
      abi: ERC20_BALANCE_OF_ABI,
      functionName: 'balanceOf',
      args: [ADDR_ALICE],
    },
    {
      address: ADDR_TOKEN,
      abi: ERC20_DECIMALS_ABI,
      functionName: 'decimals',
    },
  ] as const;
}

export function makeCreateMarketParams(
  overrides: Partial<CreateMarketTxParams> = {}
): CreateMarketTxParams {
  const now = BigInt(Math.floor(Date.now() / 1000));
  return {
    marketQuestion: 'Will it rain tomorrow?',
    marketOptions: ['Yes', 'No'],
    marketTags: ['weather'],
    marketDescription: 'A market about rain',
    isPublic: true,
    isPublicPoolResolverAi: false,
    creator: ADDR_ALICE,
    startTime: now + 3600n,
    endTime: now + 86400n,
    no_of_options: 2n,
    disputeTimer: 60,
    inputAmountWei: 10_000_000n, // 10 USDT (6 decimals)
    barValues: [50, 50],
    baseToken: ADDR_TOKEN,
    tokenDecimals: 6,
    factoryContractAddress: ADDR_FACTORY,
    apiUrl: 'https://dev-api.rain.one',
    rpcUrl: 'https://arb1.arbitrum.io/rpc',
    ...overrides,
  };
}
