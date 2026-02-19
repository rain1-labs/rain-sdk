import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock ethers before importing — use function expressions (not arrows) for constructors
vi.mock('ethers', async () => {
  const actual = await vi.importActual<typeof import('ethers')>('ethers');
  return {
    ...actual,
    JsonRpcProvider: vi.fn(),
    Contract: vi.fn(),
  };
});

import { getMarket, isRpcValid, getUserOptionShares } from '../../../src/tx/ClaimFunds/helpers.js';
import { JsonRpcProvider, Contract } from 'ethers';
import { ADDR_MARKET, ADDR_ALICE } from '../../helpers/fixtures.js';

describe('getMarket', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('fetches from correct URL', async () => {
    const mockData = { id: '123', status: 'Closed' };
    vi.mocked(globalThis.fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockData),
    } as Response);

    await getMarket({ marketId: '123', apiUrl: 'https://dev-api.rain.one' });

    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://dev-api.rain.one/pools/pool/123'
    );
  });

  it('returns parsed JSON data', async () => {
    const mockData = { id: '123', status: 'Closed', contractAddress: '0xabc' };
    vi.mocked(globalThis.fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockData),
    } as Response);

    const result = await getMarket({ marketId: '123', apiUrl: 'https://dev-api.rain.one' });
    expect(result).toEqual(mockData);
  });

  it('throws when response is not ok', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue({
      ok: false,
      status: 404,
    } as Response);

    await expect(
      getMarket({ marketId: '999', apiUrl: 'https://dev-api.rain.one' })
    ).rejects.toThrow('Failed to fetch markets: 404');
  });

  it('throws when apiUrl is missing', async () => {
    await expect(
      getMarket({ marketId: '123', apiUrl: '' })
    ).rejects.toThrow('api url is missing');
  });
});

describe('isRpcValid', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns false when rpcUrl is undefined', async () => {
    expect(await isRpcValid(undefined)).toBe(false);
  });

  it('returns false when rpcUrl is empty string', async () => {
    expect(await isRpcValid('')).toBe(false);
  });

  it('returns true when getNetwork succeeds', async () => {
    const mockGetNetwork = vi.fn().mockResolvedValue({ chainId: 42161n });
    vi.mocked(JsonRpcProvider).mockImplementation(function (this: any) {
      this.getNetwork = mockGetNetwork;
    } as any);

    expect(await isRpcValid('https://good-rpc.com')).toBe(true);
  });

  it('returns false when getNetwork throws', async () => {
    const mockGetNetwork = vi.fn().mockRejectedValue(new Error('timeout'));
    vi.mocked(JsonRpcProvider).mockImplementation(function (this: any) {
      this.getNetwork = mockGetNetwork;
    } as any);

    expect(await isRpcValid('https://bad-rpc.com')).toBe(false);
  });
});

describe('getUserOptionShares', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns shares for options with votes > 0', async () => {
    const mockUserVotes = vi.fn()
      .mockResolvedValueOnce(100n)  // option 0: has votes
      .mockResolvedValueOnce(0n);   // option 1: no votes
    vi.mocked(Contract).mockImplementation(function (this: any) {
      this.userVotes = mockUserVotes;
    } as any);

    const result = await getUserOptionShares({
      marketContractAddress: ADDR_MARKET,
      walletAddress: ADDR_ALICE,
      options: [
        { choiceIndex: 0, optionName: 'Yes' },
        { choiceIndex: 1, optionName: 'No' },
      ] as any,
      rpcUrl: 'https://rpc.com',
    });

    expect(result).toEqual([100]);
  });

  it('returns empty array when user has no shares', async () => {
    const mockUserVotes = vi.fn().mockResolvedValue(0n);
    vi.mocked(Contract).mockImplementation(function (this: any) {
      this.userVotes = mockUserVotes;
    } as any);

    const result = await getUserOptionShares({
      marketContractAddress: ADDR_MARKET,
      walletAddress: ADDR_ALICE,
      options: [{ choiceIndex: 0, optionName: 'Yes' }] as any,
      rpcUrl: 'https://rpc.com',
    });

    expect(result).toEqual([]);
  });

  it('calls userVotes with correct choiceIndex and walletAddress', async () => {
    const mockUserVotes = vi.fn().mockResolvedValue(50n);
    vi.mocked(Contract).mockImplementation(function (this: any) {
      this.userVotes = mockUserVotes;
    } as any);

    await getUserOptionShares({
      marketContractAddress: ADDR_MARKET,
      walletAddress: ADDR_ALICE,
      options: [{ choiceIndex: 3, optionName: 'Maybe' }] as any,
      rpcUrl: 'https://rpc.com',
    });

    expect(mockUserVotes).toHaveBeenCalledWith(3, ADDR_ALICE);
  });
});
