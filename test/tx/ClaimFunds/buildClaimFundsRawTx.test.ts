import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the helpers module
vi.mock('../../../src/tx/ClaimFunds/helpers.js', () => ({
  isRpcValid: vi.fn(),
  getMarket: vi.fn(),
  getUserOptionShares: vi.fn(),
}));

import { buildClaimRawTx } from '../../../src/tx/ClaimFunds/buildClaimFundsRawTx.js';
import { isRpcValid, getMarket, getUserOptionShares } from '../../../src/tx/ClaimFunds/helpers.js';
import { ADDR_ALICE, ADDR_MARKET } from '../../helpers/fixtures.js';

describe('buildClaimRawTx', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(isRpcValid).mockResolvedValue(true);
    vi.mocked(getMarket).mockResolvedValue({
      data: {
        status: 'Closed',
        contractAddress: ADDR_MARKET,
        options: [
          { choiceIndex: 0, optionName: 'Yes' },
          { choiceIndex: 1, optionName: 'No' },
        ],
      },
    } as any);
    vi.mocked(getUserOptionShares).mockResolvedValue([100]);
  });

  it('throws when apiUrl is missing', async () => {
    await expect(
      buildClaimRawTx({ marketId: '123', walletAddress: ADDR_ALICE, apiUrl: '', rpcUrl: 'https://rpc.com' })
    ).rejects.toThrow('api url is missing');
  });

  it('throws when RPC is not valid', async () => {
    vi.mocked(isRpcValid).mockResolvedValue(false);
    await expect(
      buildClaimRawTx({ marketId: '123', walletAddress: ADDR_ALICE, apiUrl: 'https://api.com', rpcUrl: 'https://bad.com' })
    ).rejects.toThrow('RPC URL is not valid');
  });

  it('throws when rpcUrl is undefined', async () => {
    vi.mocked(isRpcValid).mockResolvedValue(false);
    await expect(
      buildClaimRawTx({ marketId: '123', walletAddress: ADDR_ALICE, apiUrl: 'https://api.com', rpcUrl: undefined })
    ).rejects.toThrow('RPC URL is not valid');
  });

  it('throws when marketId is empty', async () => {
    await expect(
      buildClaimRawTx({ marketId: '', walletAddress: ADDR_ALICE, apiUrl: 'https://api.com', rpcUrl: 'https://rpc.com' })
    ).rejects.toThrow('marketContractAddress is required');
  });

  it('throws when walletAddress is empty', async () => {
    await expect(
      buildClaimRawTx({ marketId: '123', walletAddress: '' as any, apiUrl: 'https://api.com', rpcUrl: 'https://rpc.com' })
    ).rejects.toThrow('walletAddress is required');
  });

  it('throws when market is not closed', async () => {
    vi.mocked(getMarket).mockResolvedValue({
      data: { status: 'Live', contractAddress: ADDR_MARKET, options: [] },
    } as any);

    await expect(
      buildClaimRawTx({ marketId: '123', walletAddress: ADDR_ALICE, apiUrl: 'https://api.com', rpcUrl: 'https://rpc.com' })
    ).rejects.toThrow('Market is not closed yet');
  });

  it('throws when user has no shares', async () => {
    vi.mocked(getUserOptionShares).mockResolvedValue([]);

    await expect(
      buildClaimRawTx({ marketId: '123', walletAddress: ADDR_ALICE, apiUrl: 'https://api.com', rpcUrl: 'https://rpc.com' })
    ).rejects.toThrow('No shares to claim');
  });

  it('returns a claim tx targeting the market contract', async () => {
    const tx = await buildClaimRawTx({
      marketId: '123',
      walletAddress: ADDR_ALICE,
      apiUrl: 'https://api.com',
      rpcUrl: 'https://rpc.com',
    });

    expect(tx.to).toBe(ADDR_MARKET);
    expect(tx.data).toMatch(/^0x/);
  });

  it('calls getMarket with correct params', async () => {
    await buildClaimRawTx({
      marketId: 'abc',
      walletAddress: ADDR_ALICE,
      apiUrl: 'https://dev-api.rain.one',
      rpcUrl: 'https://rpc.com',
    });

    expect(getMarket).toHaveBeenCalledWith({
      marketId: 'abc',
      apiUrl: 'https://dev-api.rain.one',
    });
  });

  it('calls getUserOptionShares with data from getMarket', async () => {
    await buildClaimRawTx({
      marketId: '123',
      walletAddress: ADDR_ALICE,
      apiUrl: 'https://api.com',
      rpcUrl: 'https://rpc.com',
    });

    expect(getUserOptionShares).toHaveBeenCalledWith({
      marketContractAddress: ADDR_MARKET,
      walletAddress: ADDR_ALICE,
      options: [
        { choiceIndex: 0, optionName: 'Yes' },
        { choiceIndex: 1, optionName: 'No' },
      ],
      rpcUrl: 'https://rpc.com',
    });
  });
});
