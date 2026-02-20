import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../../src/utils/multicall.js', () => ({
  multicallRead: vi.fn(),
  createRpcClient: vi.fn(),
}));

import { getMarketDetails } from '../../src/markets/getMarketDetails.js';
import { multicallRead } from '../../src/utils/multicall.js';
import {
  ADDR_MARKET_CONTRACT,
  ADDR_TOKEN,
  ADDR_ALICE,
  ADDR_BOB,
  RPC_URL,
  MOCK_MARKET_ID,
  MOCK_API_MARKET_RESPONSE,
  makeGlobalMulticallResults,
  makePerOptionMulticallResults,
} from '../helpers/fixtures.js';

const API_URL = 'https://dev-api.rain.one';

function mockFetchOk(body: unknown) {
  vi.mocked(globalThis.fetch).mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(body),
  } as any);
}

function setupHappyPath() {
  mockFetchOk(MOCK_API_MARKET_RESPONSE);
  const globalResults = makeGlobalMulticallResults();
  const perOptionResults = makePerOptionMulticallResults([
    { currentPrice: 600000n, totalFunds: 400000n, totalVotes: 200000n },
    { currentPrice: 400000n, totalFunds: 600000n, totalVotes: 300000n },
  ]);
  vi.mocked(multicallRead)
    .mockResolvedValueOnce(globalResults)
    .mockResolvedValueOnce(perOptionResults);
}

describe('getMarketDetails', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // --- Validation ---

  it('throws when apiUrl is missing', async () => {
    await expect(
      getMarketDetails({ marketId: MOCK_MARKET_ID, apiUrl: '', rpcUrl: RPC_URL })
    ).rejects.toThrow('apiUrl is required');
  });

  it('throws when rpcUrl is missing', async () => {
    await expect(
      getMarketDetails({ marketId: MOCK_MARKET_ID, apiUrl: API_URL, rpcUrl: '' })
    ).rejects.toThrow('rpcUrl is required');
  });

  it('throws when marketId is missing', async () => {
    await expect(
      getMarketDetails({ marketId: '', apiUrl: API_URL, rpcUrl: RPC_URL })
    ).rejects.toThrow('marketId is required');
  });

  // --- API ---

  it('calls fetch with the correct endpoint', async () => {
    setupHappyPath();
    await getMarketDetails({ marketId: MOCK_MARKET_ID, apiUrl: API_URL, rpcUrl: RPC_URL });

    expect(globalThis.fetch).toHaveBeenCalledWith(
      `${API_URL}/pools/pool/${MOCK_MARKET_ID}`
    );
  });

  it('throws when API response is not ok', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue({
      ok: false,
      status: 404,
    } as any);

    await expect(
      getMarketDetails({ marketId: MOCK_MARKET_ID, apiUrl: API_URL, rpcUrl: RPC_URL })
    ).rejects.toThrow('Failed to fetch market: 404');
  });

  it('throws when API response missing contractAddress', async () => {
    mockFetchOk({ id: '1', title: 'Test', status: 'Live', options: [] });

    await expect(
      getMarketDetails({ marketId: MOCK_MARKET_ID, apiUrl: API_URL, rpcUrl: RPC_URL })
    ).rejects.toThrow('Market response missing contractAddress');
  });

  it('handles API response wrapped in data envelope', async () => {
    mockFetchOk({ data: MOCK_API_MARKET_RESPONSE });
    const globalResults = makeGlobalMulticallResults();
    const perOptionResults = makePerOptionMulticallResults([
      { currentPrice: 500000n, totalFunds: 300000n, totalVotes: 100000n },
      { currentPrice: 500000n, totalFunds: 300000n, totalVotes: 100000n },
    ]);
    vi.mocked(multicallRead)
      .mockResolvedValueOnce(globalResults)
      .mockResolvedValueOnce(perOptionResults);

    const result = await getMarketDetails({
      marketId: MOCK_MARKET_ID,
      apiUrl: API_URL,
      rpcUrl: RPC_URL,
    });

    expect(result.id).toBe(MOCK_MARKET_ID);
    expect(result.contractAddress).toBe(ADDR_MARKET_CONTRACT);
  });

  // --- Multicall ---

  it('calls multicallRead twice (global + per-option)', async () => {
    setupHappyPath();
    await getMarketDetails({ marketId: MOCK_MARKET_ID, apiUrl: API_URL, rpcUrl: RPC_URL });

    expect(multicallRead).toHaveBeenCalledTimes(2);
  });

  it('sends 18 global read calls in first multicall', async () => {
    setupHappyPath();
    await getMarketDetails({ marketId: MOCK_MARKET_ID, apiUrl: API_URL, rpcUrl: RPC_URL });

    const firstCall = vi.mocked(multicallRead).mock.calls[0];
    expect(firstCall[1]).toHaveLength(18);
  });

  it('sends 3 calls per option in second multicall', async () => {
    setupHappyPath();
    await getMarketDetails({ marketId: MOCK_MARKET_ID, apiUrl: API_URL, rpcUrl: RPC_URL });

    const secondCall = vi.mocked(multicallRead).mock.calls[1];
    // 2 options * 3 calls each = 6
    expect(secondCall[1]).toHaveLength(6);
  });

  it('addresses all multicall contracts to the pool contractAddress', async () => {
    setupHappyPath();
    await getMarketDetails({ marketId: MOCK_MARKET_ID, apiUrl: API_URL, rpcUrl: RPC_URL });

    const firstCall = vi.mocked(multicallRead).mock.calls[0];
    const secondCall = vi.mocked(multicallRead).mock.calls[1];

    for (const c of firstCall[1] as any[]) {
      expect(c.address).toBe(ADDR_MARKET_CONTRACT);
    }
    for (const c of secondCall[1] as any[]) {
      expect(c.address).toBe(ADDR_MARKET_CONTRACT);
    }
  });

  // --- Return values ---

  it('returns correct API fields', async () => {
    setupHappyPath();
    const result = await getMarketDetails({
      marketId: MOCK_MARKET_ID,
      apiUrl: API_URL,
      rpcUrl: RPC_URL,
    });

    expect(result.id).toBe(MOCK_MARKET_ID);
    expect(result.title).toBe('Will ETH reach $5000?');
    expect(result.status).toBe('Live');
    expect(result.contractAddress).toBe(ADDR_MARKET_CONTRACT);
  });

  it('returns correct on-chain fields', async () => {
    setupHappyPath();
    const result = await getMarketDetails({
      marketId: MOCK_MARKET_ID,
      apiUrl: API_URL,
      rpcUrl: RPC_URL,
    });

    expect(result.poolState).toBe(1);
    expect(result.numberOfOptions).toBe(2n);
    expect(result.startTime).toBe(1700000000n);
    expect(result.endTime).toBe(1700100000n);
    expect(result.allFunds).toBe(1000000n);
    expect(result.totalLiquidity).toBe(800000n);
    expect(result.poolFinalized).toBe(false);
    expect(result.isPublic).toBe(true);
    expect(result.baseToken).toBe(ADDR_TOKEN);
    expect(result.baseTokenDecimals).toBe(6n);
    expect(result.poolOwner).toBe(ADDR_ALICE);
    expect(result.resolver).toBe(ADDR_BOB);
    expect(result.resolverIsAI).toBe(false);
    expect(result.isDisputed).toBe(false);
    expect(result.isAppealed).toBe(false);
  });

  it('returns enriched options with on-chain data', async () => {
    setupHappyPath();
    const result = await getMarketDetails({
      marketId: MOCK_MARKET_ID,
      apiUrl: API_URL,
      rpcUrl: RPC_URL,
    });

    expect(result.options).toHaveLength(2);
    expect(result.options[0]).toEqual({
      choiceIndex: 0,
      optionName: 'Yes',
      currentPrice: 600000n,
      totalFunds: 400000n,
      totalVotes: 200000n,
    });
    expect(result.options[1]).toEqual({
      choiceIndex: 1,
      optionName: 'No',
      currentPrice: 400000n,
      totalFunds: 600000n,
      totalVotes: 300000n,
    });
  });

  // --- Error handling ---

  it('throws when a global multicall read fails', async () => {
    mockFetchOk(MOCK_API_MARKET_RESPONSE);
    const globalResults = makeGlobalMulticallResults();
    // Simulate failure on the 3rd read (startTime)
    globalResults[2] = { status: 'failure', error: new Error('revert') };
    vi.mocked(multicallRead).mockResolvedValueOnce(globalResults);

    await expect(
      getMarketDetails({ marketId: MOCK_MARKET_ID, apiUrl: API_URL, rpcUrl: RPC_URL })
    ).rejects.toThrow('Failed to read startTime from contract');
  });

  it('falls back to 0n when per-option multicall read fails', async () => {
    mockFetchOk(MOCK_API_MARKET_RESPONSE);
    const globalResults = makeGlobalMulticallResults();
    // All per-option reads fail
    const perOptionResults = [
      { status: 'failure' as const, error: new Error('revert') },
      { status: 'failure' as const, error: new Error('revert') },
      { status: 'failure' as const, error: new Error('revert') },
      { status: 'failure' as const, error: new Error('revert') },
      { status: 'failure' as const, error: new Error('revert') },
      { status: 'failure' as const, error: new Error('revert') },
    ];
    vi.mocked(multicallRead)
      .mockResolvedValueOnce(globalResults)
      .mockResolvedValueOnce(perOptionResults);

    const result = await getMarketDetails({
      marketId: MOCK_MARKET_ID,
      apiUrl: API_URL,
      rpcUrl: RPC_URL,
    });

    expect(result.options[0].currentPrice).toBe(0n);
    expect(result.options[0].totalFunds).toBe(0n);
    expect(result.options[0].totalVotes).toBe(0n);
  });

  // --- Edge case: no options ---

  it('skips per-option multicall when there are zero options', async () => {
    mockFetchOk({
      ...MOCK_API_MARKET_RESPONSE,
      options: [],
    });
    const globalResults = makeGlobalMulticallResults({ numberOfOptions: 0n });
    vi.mocked(multicallRead).mockResolvedValueOnce(globalResults);

    const result = await getMarketDetails({
      marketId: MOCK_MARKET_ID,
      apiUrl: API_URL,
      rpcUrl: RPC_URL,
    });

    expect(result.options).toHaveLength(0);
    // multicallRead called only once (global batch, no per-option batch)
    expect(multicallRead).toHaveBeenCalledTimes(1);
  });
});
