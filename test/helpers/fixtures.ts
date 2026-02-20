import { CreateMarketTxParams } from '../../src/tx/types.js';
import type { MulticallResult } from '../../src/utils/multicall.js';

export const ADDR_ALICE = '0xaAaAaAaaAaAaAaaAaAAAAAAAAaaaAaAaAaaAaaAa' as const;
export const ADDR_BOB = '0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB' as const;
export const ADDR_TOKEN = '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9' as const; // USDT on Arb
export const ADDR_FACTORY = '0x148DA7F2039B2B00633AC2ab566f59C8a4C86313' as const;
export const ADDR_MARKET = '0x1111111111111111111111111111111111111111' as const;
export const ADDR_MARKET_CONTRACT = '0x2222222222222222222222222222222222222222' as const;
export const ADDR_ZERO = '0x0000000000000000000000000000000000000000' as const;
export const RPC_URL = 'https://arb1.arbitrum.io/rpc' as const;
export const MOCK_MARKET_ID = 'mock-market-id-123' as const;

export const MOCK_API_MARKET_RESPONSE = {
  id: MOCK_MARKET_ID,
  title: 'Will ETH reach $5000?',
  status: 'Live',
  contractAddress: ADDR_MARKET_CONTRACT,
  options: [
    { choiceIndex: 0, optionName: 'Yes' },
    { choiceIndex: 1, optionName: 'No' },
  ],
};

/**
 * Produces 18 success results for the global multicall batch.
 * Order matches GLOBAL_FUNCTIONS in getMarketDetails.ts.
 */
export function makeGlobalMulticallResults(
  overrides: Partial<{
    poolState: number;
    numberOfOptions: bigint;
    startTime: bigint;
    endTime: bigint;
    oracleEndTime: bigint;
    allFunds: bigint;
    allVotes: bigint;
    totalLiquidity: bigint;
    winner: bigint;
    poolFinalized: boolean;
    isPublic: boolean;
    baseToken: string;
    baseTokenDecimals: bigint;
    poolOwner: string;
    resolver: string;
    resolverIsAI: boolean;
    isDisputed: boolean;
    isAppealed: boolean;
  }> = {}
): MulticallResult[] {
  const defaults = {
    poolState: 1,
    numberOfOptions: 2n,
    startTime: 1700000000n,
    endTime: 1700100000n,
    oracleEndTime: 1700200000n,
    allFunds: 1000000n,
    allVotes: 500000n,
    totalLiquidity: 800000n,
    winner: 0n,
    poolFinalized: false,
    isPublic: true,
    baseToken: ADDR_TOKEN,
    baseTokenDecimals: 6n,
    poolOwner: ADDR_ALICE,
    resolver: ADDR_BOB,
    resolverIsAI: false,
    isDisputed: false,
    isAppealed: false,
  };
  const merged = { ...defaults, ...overrides };
  const values = [
    merged.poolState,
    merged.numberOfOptions,
    merged.startTime,
    merged.endTime,
    merged.oracleEndTime,
    merged.allFunds,
    merged.allVotes,
    merged.totalLiquidity,
    merged.winner,
    merged.poolFinalized,
    merged.isPublic,
    merged.baseToken,
    merged.baseTokenDecimals,
    merged.poolOwner,
    merged.resolver,
    merged.resolverIsAI,
    merged.isDisputed,
    merged.isAppealed,
  ];
  return values.map((v) => ({ status: 'success' as const, result: v }));
}

/**
 * Produces 3N success results for N options (getCurrentPrice, totalFunds, totalVotes).
 */
export function makePerOptionMulticallResults(
  options: { currentPrice: bigint; totalFunds: bigint; totalVotes: bigint }[]
): MulticallResult[] {
  return options.flatMap((opt) => [
    { status: 'success' as const, result: opt.currentPrice },
    { status: 'success' as const, result: opt.totalFunds },
    { status: 'success' as const, result: opt.totalVotes },
  ]);
}

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
