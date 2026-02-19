import { describe, it, expect } from 'vitest';
import { buildEnterOptionRawTx, buildLimitBuyOrderRawTx } from '../../src/tx/buildRawTransactions.js';
import { ADDR_MARKET } from '../helpers/fixtures.js';
import { ENTER_OPTION, PLACE_BUY_ORDER } from '../../src/constants/contractmethods.js';
import { encodeFunctionData } from 'viem';
import { TradePoolAbi } from '../../src/abi/TradeMarketsAbi.js';

describe('buildEnterOptionRawTx', () => {
  const validParams = {
    marketContractAddress: ADDR_MARKET,
    selectedOption: 0n,
    buyAmountInWei: 5_000_000n,
  } as const;

  it('returns a RawTransaction targeting the market address', () => {
    const tx = buildEnterOptionRawTx(validParams);
    expect(tx.to).toBe(ADDR_MARKET);
  });

  it('returns correct encoded data for enterOption', () => {
    const tx = buildEnterOptionRawTx(validParams);
    const expected = encodeFunctionData({
      abi: TradePoolAbi,
      functionName: ENTER_OPTION,
      args: [validParams.selectedOption, validParams.buyAmountInWei],
    });
    expect(tx.data).toBe(expected);
  });

  it('throws when marketContractAddress is missing', () => {
    expect(() =>
      buildEnterOptionRawTx({ ...validParams, marketContractAddress: '' as any })
    ).toThrow('Market contract address is required');
  });

  it('throws when selectedOption is undefined', () => {
    expect(() =>
      buildEnterOptionRawTx({ ...validParams, selectedOption: undefined as any })
    ).toThrow('Selected Option is required');
  });

  it('throws when buyAmountInWei is missing', () => {
    expect(() =>
      buildEnterOptionRawTx({ ...validParams, buyAmountInWei: 0n })
    ).toThrow('Buy amount is required');
  });

  it('works with selectedOption = 0n (falsy but valid bigint)', () => {
    // selectedOption = 0n is valid (first option). The code checks `=== undefined`.
    const tx = buildEnterOptionRawTx({ ...validParams, selectedOption: 0n });
    expect(tx.to).toBe(ADDR_MARKET);
  });
});

describe('buildLimitBuyOrderRawTx', () => {
  const validParams = {
    marketContractAddress: ADDR_MARKET,
    selectedOption: 1,
    // NOTE: pricePerShare is typed as `bigint` but validated as `0 < x < 1`
    // (impossible for bigints). Runtime callers pass number (e.g., 0.5).
    pricePerShare: 0.5 as any,
    buyAmountInWei: 2_000_000n,
    tokenDecimals: 6,
  };

  it('returns a RawTransaction targeting the market address', () => {
    const tx = buildLimitBuyOrderRawTx(validParams);
    expect(tx.to).toBe(ADDR_MARKET);
  });

  it('returns correct encoded data for placeBuyOrder', () => {
    const tx = buildLimitBuyOrderRawTx(validParams);
    // pricePerShare 0.5 → convertToWeiEthers(0.5, 18) = 500000000000000000n
    const expectedPrice = 500_000_000_000_000_000n;
    const expected = encodeFunctionData({
      abi: TradePoolAbi,
      functionName: PLACE_BUY_ORDER,
      args: [BigInt(validParams.selectedOption), expectedPrice, validParams.buyAmountInWei],
    });
    expect(tx.data).toBe(expected);
  });

  it('throws when marketContractAddress is missing', () => {
    expect(() =>
      buildLimitBuyOrderRawTx({ ...validParams, marketContractAddress: '' as any })
    ).toThrow('market address is required');
  });

  it('throws when selectedOption is undefined', () => {
    expect(() =>
      buildLimitBuyOrderRawTx({ ...validParams, selectedOption: undefined as any })
    ).toThrow('selectedOption is required');
  });

  it('throws when pricePerShare is missing (0)', () => {
    expect(() =>
      buildLimitBuyOrderRawTx({ ...validParams, pricePerShare: 0 as any })
    ).toThrow('price per share is required');
  });

  it('throws when pricePerShare <= 0', () => {
    expect(() =>
      buildLimitBuyOrderRawTx({ ...validParams, pricePerShare: -0.5 as any })
    ).toThrow('price per share should be in between 0 to 1');
  });

  it('throws when pricePerShare >= 1', () => {
    expect(() =>
      buildLimitBuyOrderRawTx({ ...validParams, pricePerShare: 1 as any })
    ).toThrow('price per share should be in between 0 to 1');
  });

  it('throws when buyAmountInWei is missing (0n)', () => {
    expect(() =>
      buildLimitBuyOrderRawTx({ ...validParams, buyAmountInWei: 0n })
    ).toThrow('buy amount in wei is required');
  });

  it('throws when buyAmountInWei < 1 token', () => {
    expect(() =>
      buildLimitBuyOrderRawTx({ ...validParams, buyAmountInWei: 999_999n })
    ).toThrow('order amount should be more then $1');
  });

  it('accepts buyAmountInWei exactly equal to 1 token', () => {
    const tx = buildLimitBuyOrderRawTx({ ...validParams, buyAmountInWei: 1_000_000n });
    expect(tx.to).toBe(ADDR_MARKET);
  });

  it('defaults tokenDecimals to 6 when not provided', () => {
    const params = { ...validParams, tokenDecimals: undefined, buyAmountInWei: 1_000_000n };
    const tx = buildLimitBuyOrderRawTx(params);
    expect(tx.to).toBe(ADDR_MARKET);
  });

  it('uses custom tokenDecimals for minimum amount check', () => {
    // 18 decimals → 1 token = 10^18
    expect(() =>
      buildLimitBuyOrderRawTx({
        ...validParams,
        tokenDecimals: 18,
        buyAmountInWei: 10n ** 18n - 1n,
      })
    ).toThrow('order amount should be more then $1');
  });
});
