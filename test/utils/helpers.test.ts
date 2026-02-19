import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ethers } from 'ethers';

// Mock ethers before importing the module under test
vi.mock('ethers', async () => {
  const actual = await vi.importActual<typeof import('ethers')>('ethers');
  return {
    ...actual,
    JsonRpcProvider: vi.fn(),
    Contract: vi.fn(),
  };
});

// Mock ClaimFunds helpers (isRpcValid is called by getUserAllownace)
vi.mock('../../src/tx/ClaimFunds/helpers.js', () => ({
  isRpcValid: vi.fn(),
}));

import { convertToWeiEthers, getUserAllownace } from '../../src/utils/helpers.js';
import { isRpcValid } from '../../src/tx/ClaimFunds/helpers.js';
import { makeCreateMarketParams } from '../helpers/fixtures.js';
import { JsonRpcProvider, Contract } from 'ethers';

describe('convertToWeiEthers', () => {
  it('converts "1" with 18 decimals to 10^18', () => {
    expect(convertToWeiEthers('1', 18)).toBe(10n ** 18n);
  });

  it('converts "0.5" with 18 decimals to 5 * 10^17', () => {
    expect(convertToWeiEthers('0.5', 18)).toBe(5n * 10n ** 17n);
  });

  it('converts "1" with 6 decimals to 10^6', () => {
    expect(convertToWeiEthers('1', 6)).toBe(1_000_000n);
  });

  it('converts bigint input by stringifying', () => {
    expect(convertToWeiEthers(1n, 6)).toBe(1_000_000n);
  });

  it('converts "0.001" with 18 decimals correctly', () => {
    expect(convertToWeiEthers('0.001', 18)).toBe(10n ** 15n);
  });
});

describe('getUserAllownace', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws when RPC is not valid', async () => {
    vi.mocked(isRpcValid).mockResolvedValue(false);
    const params = makeCreateMarketParams({ rpcUrl: 'https://bad-rpc.com' });
    await expect(getUserAllownace(params)).rejects.toThrow('RPC URL is not valid');
  });

  it('throws when rpcUrl is undefined', async () => {
    vi.mocked(isRpcValid).mockResolvedValue(false);
    const params = makeCreateMarketParams({ rpcUrl: undefined });
    await expect(getUserAllownace(params)).rejects.toThrow('RPC URL is not valid');
  });

  it('calls contract.allowance with correct args when RPC is valid', async () => {
    vi.mocked(isRpcValid).mockResolvedValue(true);
    const mockAllowance = vi.fn().mockResolvedValue(1000n);
    vi.mocked(Contract).mockImplementation(function (this: any) {
      this.allowance = mockAllowance;
    } as any);

    const params = makeCreateMarketParams();
    const result = await getUserAllownace(params);

    expect(result).toBe(1000n);
    expect(mockAllowance).toHaveBeenCalledWith(params.creator, params.factoryContractAddress);
  });
});
