import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the helper modules that buildCreateMarketRawTx depends on
vi.mock('../../../src/tx/CreateMarket/helpers.js', () => ({
  normalizeBarValues: vi.fn((v: number[]) => v.map((x) => Math.floor(x * 100))),
  uploadMetaData: vi.fn(),
}));

vi.mock('../../../src/utils/helpers.js', () => ({
  getUserAllownace: vi.fn(),
  convertToWeiEthers: vi.fn(),
}));

vi.mock('../../../src/tx/CreateMarket/createMarketValidation.js', () => ({
  validateCreateMarketParams: vi.fn(() => true),
}));

import { buildCreateMarketRawTx } from '../../../src/tx/CreateMarket/buildCreateMarketRawTx.js';
import { normalizeBarValues, uploadMetaData } from '../../../src/tx/CreateMarket/helpers.js';
import { getUserAllownace } from '../../../src/utils/helpers.js';
import { validateCreateMarketParams } from '../../../src/tx/CreateMarket/createMarketValidation.js';
import { makeCreateMarketParams, ADDR_FACTORY, ADDR_TOKEN } from '../../helpers/fixtures.js';

describe('buildCreateMarketRawTx', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(uploadMetaData).mockResolvedValue('QmTestHash');
    vi.mocked(getUserAllownace).mockResolvedValue(Number(10n ** 18n)); // large allowance
  });

  it('throws when factoryContractAddress is missing', async () => {
    const params = makeCreateMarketParams({ factoryContractAddress: '' as any });
    await expect(buildCreateMarketRawTx(params)).rejects.toThrow(
      'factory contract address is missing'
    );
  });

  it('calls validateCreateMarketParams', async () => {
    await buildCreateMarketRawTx(makeCreateMarketParams());
    expect(validateCreateMarketParams).toHaveBeenCalledTimes(1);
  });

  it('calls getUserAllownace', async () => {
    await buildCreateMarketRawTx(makeCreateMarketParams());
    expect(getUserAllownace).toHaveBeenCalledTimes(1);
  });

  it('calls uploadMetaData', async () => {
    await buildCreateMarketRawTx(makeCreateMarketParams());
    expect(uploadMetaData).toHaveBeenCalledTimes(1);
  });

  it('returns only createMarket tx when allowance is sufficient', async () => {
    vi.mocked(getUserAllownace).mockResolvedValue(Number(10n ** 18n));
    const params = makeCreateMarketParams({ inputAmountWei: 10_000_000n });
    const txs = await buildCreateMarketRawTx(params);
    expect(txs).toHaveLength(1);
    expect(txs[0].to).toBe(ADDR_FACTORY);
  });

  it('prepends approval tx when allowance is insufficient', async () => {
    vi.mocked(getUserAllownace).mockResolvedValue(0);
    const params = makeCreateMarketParams({ inputAmountWei: 10_000_000n });
    const txs = await buildCreateMarketRawTx(params);
    expect(txs).toHaveLength(2);
    // First tx is approval (targets the token)
    expect(txs[0].to).toBe(ADDR_TOKEN);
    // Second tx is createMarket (targets the factory)
    expect(txs[1].to).toBe(ADDR_FACTORY);
  });

  it('createMarket tx has value = 0n', async () => {
    const txs = await buildCreateMarketRawTx(makeCreateMarketParams());
    const createTx = txs[txs.length - 1];
    expect(createTx.value).toBe(0n);
  });

  it('passes normalizeBarValues result to encoded data', async () => {
    const params = makeCreateMarketParams({ barValues: [60, 40] });
    await buildCreateMarketRawTx(params);
    expect(normalizeBarValues).toHaveBeenCalledWith([60, 40]);
  });
});
