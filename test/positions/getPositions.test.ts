import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../../src/utils/multicall.js', () => ({
  multicallRead: vi.fn(),
  createRpcClient: vi.fn(),
}));

import { getPositions } from '../../src/positions/getPositions.js';
import { multicallRead } from '../../src/utils/multicall.js';
import {
  ADDR_MARKET_CONTRACT,
  ADDR_MARKET_CONTRACT_2,
  ADDR_ALICE,
  RPC_URL,
  MOCK_API_PUBLIC_POOLS_RESPONSE,
  makePositionMulticallResults,
} from '../helpers/fixtures.js';

const API_URL = 'https://dev-api.rain.one';

function mockFetchOk(body: unknown) {
  vi.mocked(globalThis.fetch).mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(body),
  } as any);
}

function setupHappyPath() {
  mockFetchOk(MOCK_API_PUBLIC_POOLS_RESPONSE);
  const results = makePositionMulticallResults([
    {
      userLiquidity: 0n,
      claimed: false,
      dynamicPayout: [500000n, 0n],
      options: [
        { shares: 100000n, sharesInEscrow: 0n, amountInEscrow: 0n, currentPrice: 600000n },
        { shares: 0n, sharesInEscrow: 0n, amountInEscrow: 0n, currentPrice: 400000n },
      ],
    },
    {
      userLiquidity: 0n,
      claimed: false,
      dynamicPayout: [0n, 0n],
      options: [
        { shares: 50000n, sharesInEscrow: 10000n, amountInEscrow: 5000n, currentPrice: 700000n },
        { shares: 0n, sharesInEscrow: 0n, amountInEscrow: 0n, currentPrice: 300000n },
      ],
    },
  ]);
  vi.mocked(multicallRead).mockResolvedValueOnce(results);
}

describe('getPositions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // --- Validation ---

  it('throws when address is missing', async () => {
    await expect(
      getPositions({ address: '' as any, apiUrl: API_URL, rpcUrl: RPC_URL })
    ).rejects.toThrow('address is required');
  });

  it('throws when apiUrl is missing', async () => {
    await expect(
      getPositions({ address: ADDR_ALICE, apiUrl: '', rpcUrl: RPC_URL })
    ).rejects.toThrow('apiUrl is required');
  });

  it('throws when rpcUrl is missing', async () => {
    await expect(
      getPositions({ address: ADDR_ALICE, apiUrl: API_URL, rpcUrl: '' })
    ).rejects.toThrow('rpcUrl is required');
  });

  // --- API interaction ---

  it('calls fetch with correct endpoint and pagination params', async () => {
    setupHappyPath();
    await getPositions({ address: ADDR_ALICE, apiUrl: API_URL, rpcUrl: RPC_URL });

    expect(globalThis.fetch).toHaveBeenCalledWith(
      `${API_URL}/pools/public-pools?limit=200&offset=0`
    );
  });

  it('throws when API response is not ok', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue({
      ok: false,
      status: 500,
    } as any);

    await expect(
      getPositions({ address: ADDR_ALICE, apiUrl: API_URL, rpcUrl: RPC_URL })
    ).rejects.toThrow('Failed to fetch markets: 500');
  });

  it('paginates when first batch is full', async () => {
    // First call returns exactly 200 items (full page), second call returns empty
    const fullPage = Array.from({ length: 200 }, (_, i) => ({
      id: `pool-${i}`,
      title: `Market ${i}`,
      status: 'Live',
      contractAddress: ADDR_MARKET_CONTRACT,
      options: [{ choiceIndex: 0, optionName: 'Yes' }],
    }));

    vi.mocked(globalThis.fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(fullPage),
      } as any)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      } as any);

    // All markets, all zero positions → empty results
    const zeroResults = makePositionMulticallResults(
      fullPage.map(() => ({
        userLiquidity: 0n,
        claimed: false,
        dynamicPayout: [],
        options: [{ shares: 0n, sharesInEscrow: 0n, amountInEscrow: 0n, currentPrice: 500000n }],
      }))
    );
    vi.mocked(multicallRead).mockResolvedValueOnce(zeroResults);

    await getPositions({ address: ADDR_ALICE, apiUrl: API_URL, rpcUrl: RPC_URL });

    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      `${API_URL}/pools/public-pools?limit=200&offset=0`
    );
    expect(globalThis.fetch).toHaveBeenCalledWith(
      `${API_URL}/pools/public-pools?limit=200&offset=200`
    );
  });

  it('handles API response wrapped in { data: { pools: [...] } }', async () => {
    const wrapped = {
      statusCode: 200,
      message: 'Public pool list fetched successfully',
      data: { pools: MOCK_API_PUBLIC_POOLS_RESPONSE },
    };
    vi.mocked(globalThis.fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(wrapped),
    } as any);
    const results = makePositionMulticallResults([
      {
        userLiquidity: 50000n,
        claimed: false,
        dynamicPayout: [],
        options: [
          { shares: 0n, sharesInEscrow: 0n, amountInEscrow: 0n, currentPrice: 500000n },
          { shares: 0n, sharesInEscrow: 0n, amountInEscrow: 0n, currentPrice: 500000n },
        ],
      },
      {
        userLiquidity: 0n,
        claimed: false,
        dynamicPayout: [],
        options: [
          { shares: 0n, sharesInEscrow: 0n, amountInEscrow: 0n, currentPrice: 500000n },
          { shares: 0n, sharesInEscrow: 0n, amountInEscrow: 0n, currentPrice: 500000n },
        ],
      },
    ]);
    vi.mocked(multicallRead).mockResolvedValueOnce(results);

    const result = await getPositions({ address: ADDR_ALICE, apiUrl: API_URL, rpcUrl: RPC_URL });

    // Only first market has liquidity
    expect(result.markets).toHaveLength(1);
    expect(result.markets[0].marketId).toBe('pool-1');
  });

  it('handles API response wrapped in { data: [...] }', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: MOCK_API_PUBLIC_POOLS_RESPONSE }),
    } as any);
    const results = makePositionMulticallResults([
      {
        userLiquidity: 100n,
        claimed: false,
        dynamicPayout: [],
        options: [
          { shares: 0n, sharesInEscrow: 0n, amountInEscrow: 0n, currentPrice: 500000n },
          { shares: 0n, sharesInEscrow: 0n, amountInEscrow: 0n, currentPrice: 500000n },
        ],
      },
      {
        userLiquidity: 0n,
        claimed: false,
        dynamicPayout: [],
        options: [
          { shares: 0n, sharesInEscrow: 0n, amountInEscrow: 0n, currentPrice: 500000n },
          { shares: 0n, sharesInEscrow: 0n, amountInEscrow: 0n, currentPrice: 500000n },
        ],
      },
    ]);
    vi.mocked(multicallRead).mockResolvedValueOnce(results);

    const result = await getPositions({ address: ADDR_ALICE, apiUrl: API_URL, rpcUrl: RPC_URL });
    expect(result.markets).toHaveLength(1);
  });

  it('returns empty when all markets lack contractAddress', async () => {
    mockFetchOk([
      { id: 'pool-no-contract', title: 'No Contract', status: 'Live', options: [] },
    ]);

    const result = await getPositions({ address: ADDR_ALICE, apiUrl: API_URL, rpcUrl: RPC_URL });
    expect(result.markets).toHaveLength(0);
    expect(multicallRead).not.toHaveBeenCalled();
  });

  // --- Multicall batching ---

  it('calls multicallRead once with all contracts batched', async () => {
    setupHappyPath();
    await getPositions({ address: ADDR_ALICE, apiUrl: API_URL, rpcUrl: RPC_URL });

    expect(multicallRead).toHaveBeenCalledTimes(1);
  });

  it('sends correct number of calls: 3 per market + 4 per option', async () => {
    setupHappyPath();
    await getPositions({ address: ADDR_ALICE, apiUrl: API_URL, rpcUrl: RPC_URL });

    const call = vi.mocked(multicallRead).mock.calls[0];
    // 2 markets × (3 market reads + 2 options × 4 option reads) = 2 × (3 + 8) = 22
    expect(call[1]).toHaveLength(22);
  });

  it('addresses contracts to correct market addresses', async () => {
    setupHappyPath();
    await getPositions({ address: ADDR_ALICE, apiUrl: API_URL, rpcUrl: RPC_URL });

    const contracts = vi.mocked(multicallRead).mock.calls[0][1] as any[];
    // First 11 should be ADDR_MARKET_CONTRACT (3 + 2*4)
    for (let i = 0; i < 11; i++) {
      expect(contracts[i].address).toBe(ADDR_MARKET_CONTRACT);
    }
    // Next 11 should be ADDR_MARKET_CONTRACT_2
    for (let i = 11; i < 22; i++) {
      expect(contracts[i].address).toBe(ADDR_MARKET_CONTRACT_2);
    }
  });

  // --- Filtering ---

  it('filters out markets where user has no position', async () => {
    mockFetchOk(MOCK_API_PUBLIC_POOLS_RESPONSE);
    const results = makePositionMulticallResults([
      {
        userLiquidity: 0n,
        claimed: false,
        dynamicPayout: [],
        options: [
          { shares: 100000n, sharesInEscrow: 0n, amountInEscrow: 0n, currentPrice: 600000n },
          { shares: 0n, sharesInEscrow: 0n, amountInEscrow: 0n, currentPrice: 400000n },
        ],
      },
      {
        userLiquidity: 0n,
        claimed: false,
        dynamicPayout: [],
        options: [
          { shares: 0n, sharesInEscrow: 0n, amountInEscrow: 0n, currentPrice: 700000n },
          { shares: 0n, sharesInEscrow: 0n, amountInEscrow: 0n, currentPrice: 300000n },
        ],
      },
    ]);
    vi.mocked(multicallRead).mockResolvedValueOnce(results);

    const result = await getPositions({ address: ADDR_ALICE, apiUrl: API_URL, rpcUrl: RPC_URL });

    // Only the first market has shares > 0
    expect(result.markets).toHaveLength(1);
    expect(result.markets[0].marketId).toBe('pool-1');
  });

  it('includes market when user only has liquidity', async () => {
    mockFetchOk([MOCK_API_PUBLIC_POOLS_RESPONSE[0]]);
    const results = makePositionMulticallResults([
      {
        userLiquidity: 50000n,
        claimed: false,
        dynamicPayout: [],
        options: [
          { shares: 0n, sharesInEscrow: 0n, amountInEscrow: 0n, currentPrice: 500000n },
          { shares: 0n, sharesInEscrow: 0n, amountInEscrow: 0n, currentPrice: 500000n },
        ],
      },
    ]);
    vi.mocked(multicallRead).mockResolvedValueOnce(results);

    const result = await getPositions({ address: ADDR_ALICE, apiUrl: API_URL, rpcUrl: RPC_URL });

    expect(result.markets).toHaveLength(1);
    expect(result.markets[0].userLiquidity).toBe(50000n);
  });

  it('includes market when user has sharesInEscrow only', async () => {
    mockFetchOk([MOCK_API_PUBLIC_POOLS_RESPONSE[0]]);
    const results = makePositionMulticallResults([
      {
        userLiquidity: 0n,
        claimed: false,
        dynamicPayout: [],
        options: [
          { shares: 0n, sharesInEscrow: 25000n, amountInEscrow: 0n, currentPrice: 500000n },
          { shares: 0n, sharesInEscrow: 0n, amountInEscrow: 0n, currentPrice: 500000n },
        ],
      },
    ]);
    vi.mocked(multicallRead).mockResolvedValueOnce(results);

    const result = await getPositions({ address: ADDR_ALICE, apiUrl: API_URL, rpcUrl: RPC_URL });
    expect(result.markets).toHaveLength(1);
  });

  // --- Graceful degradation ---

  it('defaults to 0n/false when per-market reads fail', async () => {
    mockFetchOk([MOCK_API_PUBLIC_POOLS_RESPONSE[0]]);
    // All reads fail
    const failedResults = Array.from({ length: 11 }, () => ({
      status: 'failure' as const,
      error: new Error('revert'),
    }));
    vi.mocked(multicallRead).mockResolvedValueOnce(failedResults);

    const result = await getPositions({ address: ADDR_ALICE, apiUrl: API_URL, rpcUrl: RPC_URL });

    // No position since everything defaults to 0
    expect(result.markets).toHaveLength(0);
  });

  it('defaults option values to 0n on failure but includes market if other options have position', async () => {
    mockFetchOk([MOCK_API_PUBLIC_POOLS_RESPONSE[0]]);
    const results = [
      // userLiquidity
      { status: 'success' as const, result: 0n },
      // claimed
      { status: 'success' as const, result: false },
      // getDynamicPayout
      { status: 'failure' as const, error: new Error('revert') },
      // option 0: userVotes succeeds, rest fail
      { status: 'success' as const, result: 100000n },
      { status: 'failure' as const, error: new Error('revert') },
      { status: 'failure' as const, error: new Error('revert') },
      { status: 'failure' as const, error: new Error('revert') },
      // option 1: all fail
      { status: 'failure' as const, error: new Error('revert') },
      { status: 'failure' as const, error: new Error('revert') },
      { status: 'failure' as const, error: new Error('revert') },
      { status: 'failure' as const, error: new Error('revert') },
    ];
    vi.mocked(multicallRead).mockResolvedValueOnce(results);

    const result = await getPositions({ address: ADDR_ALICE, apiUrl: API_URL, rpcUrl: RPC_URL });

    expect(result.markets).toHaveLength(1);
    expect(result.markets[0].dynamicPayout).toEqual([]);
    expect(result.markets[0].options[0].shares).toBe(100000n);
    expect(result.markets[0].options[0].sharesInEscrow).toBe(0n);
    expect(result.markets[0].options[1].shares).toBe(0n);
  });

  // --- Return values ---

  it('returns correct structure with address and markets', async () => {
    setupHappyPath();
    const result = await getPositions({ address: ADDR_ALICE, apiUrl: API_URL, rpcUrl: RPC_URL });

    expect(result.address).toBe(ADDR_ALICE);
    expect(result.markets).toHaveLength(2);
  });

  it('returns correct market fields from API', async () => {
    setupHappyPath();
    const result = await getPositions({ address: ADDR_ALICE, apiUrl: API_URL, rpcUrl: RPC_URL });

    expect(result.markets[0].marketId).toBe('pool-1');
    expect(result.markets[0].title).toBe('Will ETH reach $5000?');
    expect(result.markets[0].status).toBe('Live');
    expect(result.markets[0].contractAddress).toBe(ADDR_MARKET_CONTRACT);
  });

  it('returns correct option data from multicall', async () => {
    setupHappyPath();
    const result = await getPositions({ address: ADDR_ALICE, apiUrl: API_URL, rpcUrl: RPC_URL });

    const opt0 = result.markets[0].options[0];
    expect(opt0.choiceIndex).toBe(0);
    expect(opt0.optionName).toBe('Yes');
    expect(opt0.shares).toBe(100000n);
    expect(opt0.sharesInEscrow).toBe(0n);
    expect(opt0.amountInEscrow).toBe(0n);
    expect(opt0.currentPrice).toBe(600000n);
  });

  it('returns dynamicPayout as bigint array', async () => {
    setupHappyPath();
    const result = await getPositions({ address: ADDR_ALICE, apiUrl: API_URL, rpcUrl: RPC_URL });

    expect(result.markets[0].dynamicPayout).toEqual([500000n, 0n]);
  });

  it('returns claimed status', async () => {
    mockFetchOk([MOCK_API_PUBLIC_POOLS_RESPONSE[0]]);
    const results = makePositionMulticallResults([
      {
        userLiquidity: 100n,
        claimed: true,
        dynamicPayout: [],
        options: [
          { shares: 0n, sharesInEscrow: 0n, amountInEscrow: 0n, currentPrice: 500000n },
          { shares: 0n, sharesInEscrow: 0n, amountInEscrow: 0n, currentPrice: 500000n },
        ],
      },
    ]);
    vi.mocked(multicallRead).mockResolvedValueOnce(results);

    const result = await getPositions({ address: ADDR_ALICE, apiUrl: API_URL, rpcUrl: RPC_URL });
    expect(result.markets[0].claimed).toBe(true);
  });
});
