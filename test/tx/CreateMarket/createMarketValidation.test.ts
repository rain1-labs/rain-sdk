import { describe, it, expect } from 'vitest';
import { validateCreateMarketParams } from '../../../src/tx/CreateMarket/createMarketValidation.js';
import { makeCreateMarketParams, ADDR_ALICE, ADDR_TOKEN, ADDR_FACTORY } from '../../helpers/fixtures.js';

describe('validateCreateMarketParams', () => {
  it('returns true for valid params', () => {
    expect(validateCreateMarketParams(makeCreateMarketParams())).toBe(true);
  });

  // isPublic
  it('throws when isPublic is not a boolean', () => {
    expect(() =>
      validateCreateMarketParams(makeCreateMarketParams({ isPublic: undefined as any }))
    ).toThrow('isPublic is required and must be a boolean');
  });

  it('throws when isPublic is a string', () => {
    expect(() =>
      validateCreateMarketParams(makeCreateMarketParams({ isPublic: 'true' as any }))
    ).toThrow('isPublic is required and must be a boolean');
  });

  // isPublicPoolResolverAi
  it('throws when isPublicPoolResolverAi is not a boolean', () => {
    expect(() =>
      validateCreateMarketParams(makeCreateMarketParams({ isPublicPoolResolverAi: 1 as any }))
    ).toThrow('isPublicPoolResolverAi is required and must be a boolean');
  });

  // creator
  it('throws when creator is empty', () => {
    expect(() =>
      validateCreateMarketParams(makeCreateMarketParams({ creator: '' as any }))
    ).toThrow('creator address is required');
  });

  // marketQuestion
  it('throws when marketQuestion is empty', () => {
    expect(() =>
      validateCreateMarketParams(makeCreateMarketParams({ marketQuestion: '' }))
    ).toThrow('question is required');
  });

  // marketDescription
  it('throws when marketDescription is empty', () => {
    expect(() =>
      validateCreateMarketParams(makeCreateMarketParams({ marketDescription: '' }))
    ).toThrow('description is required');
  });

  // marketOptions
  it('throws when marketOptions has fewer than 2 items', () => {
    expect(() =>
      validateCreateMarketParams(makeCreateMarketParams({ marketOptions: ['Yes'] }))
    ).toThrow('options must be between 2 and 26');
  });

  it('throws when marketOptions has more than 26 items', () => {
    const opts = Array.from({ length: 27 }, (_, i) => `Option${i}`);
    expect(() =>
      validateCreateMarketParams(makeCreateMarketParams({ marketOptions: opts }))
    ).toThrow('options must be between 2 and 26');
  });

  it('throws when marketOptions is not an array', () => {
    expect(() =>
      validateCreateMarketParams(makeCreateMarketParams({ marketOptions: 'abc' as any }))
    ).toThrow('options must be between 2 and 26');
  });

  it('throws when marketOptions contains an empty string', () => {
    expect(() =>
      validateCreateMarketParams(makeCreateMarketParams({ marketOptions: ['Yes', ''] }))
    ).toThrow('options cannot contain empty values');
  });

  it('throws when marketOptions contains a whitespace-only string', () => {
    expect(() =>
      validateCreateMarketParams(makeCreateMarketParams({ marketOptions: ['Yes', '   '] }))
    ).toThrow('options cannot contain empty values');
  });

  // marketTags
  it('throws when marketTags is empty array', () => {
    expect(() =>
      validateCreateMarketParams(makeCreateMarketParams({ marketTags: [] }))
    ).toThrow('tags must be between 1 and 3');
  });

  it('throws when marketTags has more than 3 items', () => {
    expect(() =>
      validateCreateMarketParams(makeCreateMarketParams({ marketTags: ['a', 'b', 'c', 'd'] }))
    ).toThrow('tags must be between 1 and 3');
  });

  it('throws when marketTags contains an empty string', () => {
    expect(() =>
      validateCreateMarketParams(makeCreateMarketParams({ marketTags: [''] }))
    ).toThrow('tags cannot contain empty values');
  });

  // startTime / endTime
  it('throws when startTime is missing (0n is falsy)', () => {
    expect(() =>
      validateCreateMarketParams(makeCreateMarketParams({ startTime: 0n }))
    ).toThrow('startTime is required');
  });

  it('throws when endTime is missing (0n is falsy)', () => {
    expect(() =>
      validateCreateMarketParams(makeCreateMarketParams({ endTime: 0n }))
    ).toThrow('endTime is required');
  });

  it('throws when startTime >= endTime', () => {
    const t = BigInt(Math.floor(Date.now() / 1000)) + 1000n;
    expect(() =>
      validateCreateMarketParams(makeCreateMarketParams({ startTime: t, endTime: t }))
    ).toThrow('startTime must be earlier than endTime');
  });

  // no_of_options
  it('throws when no_of_options is missing (0n)', () => {
    expect(() =>
      validateCreateMarketParams(makeCreateMarketParams({ no_of_options: 0n }))
    ).toThrow('number of options is required');
  });

  // inputAmountWei
  it('throws when inputAmountWei is missing (0n)', () => {
    expect(() =>
      validateCreateMarketParams(makeCreateMarketParams({ inputAmountWei: 0n }))
    ).toThrow('inputAmountWei is required');
  });

  it('throws when inputAmountWei is less than $10', () => {
    expect(() =>
      validateCreateMarketParams(makeCreateMarketParams({ inputAmountWei: 9_999_999n }))
    ).toThrow('inputAmountWei must be at least $10');
  });

  it('accepts inputAmountWei exactly $10', () => {
    expect(
      validateCreateMarketParams(makeCreateMarketParams({ inputAmountWei: 10_000_000n }))
    ).toBe(true);
  });

  // barValues
  it('throws when barValues is empty', () => {
    expect(() =>
      validateCreateMarketParams(makeCreateMarketParams({ barValues: [] }))
    ).toThrow('barValues array is required');
  });

  it('throws when barValues is null', () => {
    expect(() =>
      validateCreateMarketParams(makeCreateMarketParams({ barValues: null as any }))
    ).toThrow('barValues array is required');
  });

  // baseToken
  it('throws when baseToken is empty', () => {
    expect(() =>
      validateCreateMarketParams(makeCreateMarketParams({ baseToken: '' as any }))
    ).toThrow('baseToken address is required');
  });

  // factoryContractAddress
  it('throws when factoryContractAddress is empty', () => {
    expect(() =>
      validateCreateMarketParams(makeCreateMarketParams({ factoryContractAddress: '' as any }))
    ).toThrow('factoryContractAddress is required');
  });

  // tokenDecimals default
  it('uses tokenDecimals default of 6 for minimum amount calculation', () => {
    // 10 * 10^6 = 10_000_000 → exactly $10 at 6 decimals
    expect(
      validateCreateMarketParams(
        makeCreateMarketParams({ inputAmountWei: 10_000_000n, tokenDecimals: undefined })
      )
    ).toBe(true);
  });

  it('respects custom tokenDecimals for minimum amount', () => {
    // 18 decimals → $10 = 10 * 10^18
    expect(() =>
      validateCreateMarketParams(
        makeCreateMarketParams({ inputAmountWei: 10_000_000n, tokenDecimals: 18 })
      )
    ).toThrow('inputAmountWei must be at least $10');
  });
});
