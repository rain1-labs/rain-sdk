import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../../src/utils/multicall.js', () => ({
  multicallRead: vi.fn(),
  createRpcClient: vi.fn(),
}));

import { getMarketPrices } from '../../src/markets/getMarketPrices.js';
import { multicallRead } from '../../src/utils/multicall.js';
import {
  ADDR_MARKET_CONTRACT,
  RPC_URL,
  MOCK_MARKET_ID,
  MOCK_API_MARKET_RESPONSE,
  makePriceMulticallResults,
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
  const priceResults = makePriceMulticallResults([600000n, 400000n]);
  vi.mocked(multicallRead).mockResolvedValueOnce(priceResults);
}

describe('getMarketPrices', () => {
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
      getMarketPrices({ marketId: MOCK_MARKET_ID, apiUrl: '', rpcUrl: RPC_URL })
    ).rejects.toThrow('apiUrl is required');
  });

  it('throws when rpcUrl is missing', async () => {
    await expect(
      getMarketPrices({ marketId: MOCK_MARKET_ID, apiUrl: API_URL, rpcUrl: '' })
    ).rejects.toThrow('rpcUrl is required');
  });

  it('throws when marketId is missing', async () => {
    await expect(
      getMarketPrices({ marketId: '', apiUrl: API_URL, rpcUrl: RPC_URL })
    ).rejects.toThrow('marketId is required');
  });

  // --- API ---

  it('calls fetch with the correct endpoint', async () => {
    setupHappyPath();
    await getMarketPrices({ marketId: MOCK_MARKET_ID, apiUrl: API_URL, rpcUrl: RPC_URL });

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
      getMarketPrices({ marketId: MOCK_MARKET_ID, apiUrl: API_URL, rpcUrl: RPC_URL })
    ).rejects.toThrow('Failed to fetch market: 404');
  });

  it('throws when API response missing contractAddress', async () => {
    mockFetchOk({ id: '1', title: 'Test', status: 'Live', options: [] });

    await expect(
      getMarketPrices({ marketId: MOCK_MARKET_ID, apiUrl: API_URL, rpcUrl: RPC_URL })
    ).rejects.toThrow('Market response missing contractAddress');
  });

  it('handles API response wrapped in data envelope', async () => {
    mockFetchOk({ data: MOCK_API_MARKET_RESPONSE });
    const priceResults = makePriceMulticallResults([500000n, 500000n]);
    vi.mocked(multicallRead).mockResolvedValueOnce(priceResults);

    const result = await getMarketPrices({
      marketId: MOCK_MARKET_ID,
      apiUrl: API_URL,
      rpcUrl: RPC_URL,
    });

    expect(result).toHaveLength(2);
    expect(result[0].currentPrice).toBe(500000n);
  });

  // --- Multicall ---

  it('calls multicallRead once with N contracts (1 per option)', async () => {
    setupHappyPath();
    await getMarketPrices({ marketId: MOCK_MARKET_ID, apiUrl: API_URL, rpcUrl: RPC_URL });

    expect(multicallRead).toHaveBeenCalledTimes(1);
    const call = vi.mocked(multicallRead).mock.calls[0];
    // 2 options = 2 contracts
    expect(call[1]).toHaveLength(2);
  });

  it('addresses all multicall contracts to the pool contractAddress', async () => {
    setupHappyPath();
    await getMarketPrices({ marketId: MOCK_MARKET_ID, apiUrl: API_URL, rpcUrl: RPC_URL });

    const call = vi.mocked(multicallRead).mock.calls[0];
    for (const c of call[1] as any[]) {
      expect(c.address).toBe(ADDR_MARKET_CONTRACT);
    }
  });

  // --- Return values ---

  it('returns correct OptionPrice[] shape with correct values', async () => {
    setupHappyPath();
    const result = await getMarketPrices({
      marketId: MOCK_MARKET_ID,
      apiUrl: API_URL,
      rpcUrl: RPC_URL,
    });

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      choiceIndex: 0,
      optionName: 'Yes',
      currentPrice: 600000n,
    });
    expect(result[1]).toEqual({
      choiceIndex: 1,
      optionName: 'No',
      currentPrice: 400000n,
    });
  });

  it('uses choiceIndex from API response', async () => {
    mockFetchOk({
      ...MOCK_API_MARKET_RESPONSE,
      options: [
        { choiceIndex: 5, optionName: 'Alpha' },
        { choiceIndex: 10, optionName: 'Beta' },
      ],
    });
    vi.mocked(multicallRead).mockResolvedValueOnce(
      makePriceMulticallResults([300000n, 700000n])
    );

    const result = await getMarketPrices({
      marketId: MOCK_MARKET_ID,
      apiUrl: API_URL,
      rpcUrl: RPC_URL,
    });

    expect(result[0].choiceIndex).toBe(5);
    expect(result[1].choiceIndex).toBe(10);
  });

  // --- Error handling ---

  it('falls back to 0n when per-option multicall read fails', async () => {
    mockFetchOk(MOCK_API_MARKET_RESPONSE);
    const failedResults = [
      { status: 'failure' as const, error: new Error('revert') },
      { status: 'failure' as const, error: new Error('revert') },
    ];
    vi.mocked(multicallRead).mockResolvedValueOnce(failedResults);

    const result = await getMarketPrices({
      marketId: MOCK_MARKET_ID,
      apiUrl: API_URL,
      rpcUrl: RPC_URL,
    });

    expect(result[0].currentPrice).toBe(0n);
    expect(result[1].currentPrice).toBe(0n);
  });

  // --- Edge case ---

  it('skips multicall when there are zero options', async () => {
    mockFetchOk({
      ...MOCK_API_MARKET_RESPONSE,
      options: [],
    });

    const result = await getMarketPrices({
      marketId: MOCK_MARKET_ID,
      apiUrl: API_URL,
      rpcUrl: RPC_URL,
    });

    expect(result).toHaveLength(0);
    expect(multicallRead).not.toHaveBeenCalled();
  });
});
