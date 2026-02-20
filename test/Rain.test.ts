import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock async dependencies so Rain constructor and sync methods work without network
vi.mock('../src/markets/getMarkets.js', () => ({
  getMarkets: vi.fn().mockResolvedValue([]),
}));
vi.mock('../src/markets/getMarketDetails.js', () => ({
  getMarketDetails: vi.fn().mockResolvedValue({ id: 'test', title: 'Mock' }),
}));
vi.mock('../src/markets/getMarketPrices.js', () => ({
  getMarketPrices: vi.fn().mockResolvedValue([]),
}));
vi.mock('../src/accounts/getEOAFromSmartAccount.js', () => ({
  getEOAFromSmartAccount: vi.fn().mockResolvedValue('0xOwnerAddress'),
}));

import { Rain } from '../src/Rain.js';
import { ENV_CONFIG, ALLOWED_ENVIRONMENTS } from '../src/config/environments.js';
import { getMarkets } from '../src/markets/getMarkets.js';
import { getMarketDetails } from '../src/markets/getMarketDetails.js';
import { getMarketPrices } from '../src/markets/getMarketPrices.js';
import { getEOAFromSmartAccount } from '../src/accounts/getEOAFromSmartAccount.js';

describe('Rain constructor', () => {
  it('defaults to development environment', () => {
    const rain = new Rain();
    expect(rain.environment).toBe('development');
  });

  it('accepts each allowed environment', () => {
    for (const env of ALLOWED_ENVIRONMENTS) {
      const rain = new Rain({ environment: env });
      expect(rain.environment).toBe(env);
    }
  });

  it('throws for an invalid environment', () => {
    expect(() => new Rain({ environment: 'invalid' as any })).toThrow(
      'Invalid environment "invalid"'
    );
  });

  it('throws with list of allowed values', () => {
    expect(() => new Rain({ environment: 'bad' as any })).toThrow(
      'development, stage, production'
    );
  });
});

describe('Rain.buildApprovalTx', () => {
  it('delegates to buildApproveRawTx and returns a RawTransaction', () => {
    const rain = new Rain();
    const tx = rain.buildApprovalTx({
      tokenAddress: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
      spender: '0x148DA7F2039B2B00633AC2ab566f59C8a4C86313',
    });
    expect(tx).toHaveProperty('to');
    expect(tx).toHaveProperty('data');
  });
});

describe('Rain.buildBuyOptionRawTx', () => {
  it('delegates to buildEnterOptionRawTx', () => {
    const rain = new Rain();
    const tx = rain.buildBuyOptionRawTx({
      marketContractAddress: '0x1111111111111111111111111111111111111111',
      selectedOption: 0n,
      buyAmountInWei: 5_000_000n,
    });
    expect(tx.to).toBe('0x1111111111111111111111111111111111111111');
    expect(tx.data).toMatch(/^0x/);
  });
});

describe('Rain.buildLimitBuyOptionTx', () => {
  it('delegates to buildLimitBuyOrderRawTx', () => {
    const rain = new Rain();
    const tx = rain.buildLimitBuyOptionTx({
      marketContractAddress: '0x1111111111111111111111111111111111111111',
      selectedOption: 1,
      pricePerShare: 0.5 as any,
      buyAmountInWei: 2_000_000n,
    });
    expect(tx.to).toBe('0x1111111111111111111111111111111111111111');
  });
});

describe('Rain.getPublicMarkets', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls getMarkets with apiUrl from environment config', async () => {
    const rain = new Rain({ environment: 'development' });
    await rain.getPublicMarkets({ limit: 5 });

    expect(getMarkets).toHaveBeenCalledWith(
      expect.objectContaining({
        limit: 5,
        apiUrl: ENV_CONFIG.development.apiUrl,
      })
    );
  });

  it('returns the result from getMarkets', async () => {
    const mockMarkets = [{ id: '1', title: 'Test', totalVolume: '100', status: 'Live' as const }];
    vi.mocked(getMarkets).mockResolvedValue(mockMarkets);

    const rain = new Rain();
    const result = await rain.getPublicMarkets({});
    expect(result).toEqual(mockMarkets);
  });
});

describe('Rain.getMarketDetails', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls getMarketDetails with correct params', async () => {
    const rain = new Rain({ environment: 'development' });
    await rain.getMarketDetails('my-market-id');

    expect(getMarketDetails).toHaveBeenCalledWith(
      expect.objectContaining({
        marketId: 'my-market-id',
        apiUrl: ENV_CONFIG.development.apiUrl,
      })
    );
    // rpcUrl should be present (string)
    const callArgs = vi.mocked(getMarketDetails).mock.calls[0][0];
    expect(typeof callArgs.rpcUrl).toBe('string');
  });

  it('returns the result from getMarketDetails', async () => {
    const mockDetails = { id: 'abc', title: 'Detail Test' };
    vi.mocked(getMarketDetails).mockResolvedValue(mockDetails as any);

    const rain = new Rain();
    const result = await rain.getMarketDetails('abc');
    expect(result).toEqual(mockDetails);
  });
});

describe('Rain.getMarketPrices', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls getMarketPrices with correct params', async () => {
    const rain = new Rain({ environment: 'development' });
    await rain.getMarketPrices('my-market-id');

    expect(getMarketPrices).toHaveBeenCalledWith(
      expect.objectContaining({
        marketId: 'my-market-id',
        apiUrl: ENV_CONFIG.development.apiUrl,
      })
    );
    const callArgs = vi.mocked(getMarketPrices).mock.calls[0][0];
    expect(typeof callArgs.rpcUrl).toBe('string');
  });

  it('returns the result from getMarketPrices', async () => {
    const mockPrices = [
      { choiceIndex: 0, optionName: 'Yes', currentPrice: 600000n },
    ];
    vi.mocked(getMarketPrices).mockResolvedValue(mockPrices);

    const rain = new Rain();
    const result = await rain.getMarketPrices('abc');
    expect(result).toEqual(mockPrices);
  });
});

describe('Rain.getEOAFromSmartAccount', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls getEOAFromSmartAccount with smartAccountAddress and rpcUrl', async () => {
    const rain = new Rain({ environment: 'development' });
    await rain.getEOAFromSmartAccount('0xABCDEF1234567890ABCDEF1234567890ABCDEF12');

    expect(getEOAFromSmartAccount).toHaveBeenCalledWith(
      expect.objectContaining({
        smartAccountAddress: '0xABCDEF1234567890ABCDEF1234567890ABCDEF12',
      })
    );
    const callArgs = vi.mocked(getEOAFromSmartAccount).mock.calls[0][0];
    expect(typeof callArgs.rpcUrl).toBe('string');
  });

  it('returns the owner address', async () => {
    vi.mocked(getEOAFromSmartAccount).mockResolvedValue('0x1234000000000000000000000000000000005678');

    const rain = new Rain();
    const result = await rain.getEOAFromSmartAccount('0xABCDEF1234567890ABCDEF1234567890ABCDEF12');
    expect(result).toBe('0x1234000000000000000000000000000000005678');
  });
});
