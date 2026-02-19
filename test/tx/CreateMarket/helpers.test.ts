import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { normalizeBarValues, uploadMetaData } from '../../../src/tx/CreateMarket/helpers.js';
import { makeCreateMarketParams } from '../../helpers/fixtures.js';

describe('normalizeBarValues', () => {
  it('transforms percentages to basis points (×100)', () => {
    expect(normalizeBarValues([50, 50])).toEqual([5000, 5000]);
  });

  it('adjusts last element to ensure sum is 10000', () => {
    // 33.33 → floor(3333), 33.33 → 3333, 33.34 → 3334 = 10000
    // floor(33.33 * 100) = 3333 × 3 = 9999 → last += 1 = 3334
    const result = normalizeBarValues([33.33, 33.33, 33.34]);
    expect(result.reduce((a, b) => a + b, 0)).toBe(10000);
  });

  it('handles exact values that sum to 10000', () => {
    const result = normalizeBarValues([25, 25, 25, 25]);
    expect(result).toEqual([2500, 2500, 2500, 2500]);
    expect(result.reduce((a, b) => a + b, 0)).toBe(10000);
  });

  it('handles two options with uneven split', () => {
    const result = normalizeBarValues([60, 40]);
    expect(result).toEqual([6000, 4000]);
  });

  it('handles small fractional values', () => {
    const result = normalizeBarValues([10.5, 89.5]);
    // floor(10.5*100)=1050, floor(89.5*100)=8950 → sum=10000 → no adjust
    expect(result.reduce((a, b) => a + b, 0)).toBe(10000);
  });

  it('handles single-element array', () => {
    const result = normalizeBarValues([100]);
    expect(result).toEqual([10000]);
  });
});

describe('uploadMetaData', () => {
  // uploadMetaData passes startTime, endTime, no_of_options into JSON.stringify.
  // These are typed as bigint but JSON.stringify can't serialize BigInt.
  // Use number values in tests to avoid this (matches real-world usage where
  // callers often pass numbers despite the bigint type).
  function makeUploadParams(overrides = {}) {
    return makeCreateMarketParams({
      startTime: 1700000000 as any,
      endTime: 1700086400 as any,
      no_of_options: 2 as any,
      ...overrides,
    });
  }

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('calls fetch with correct URL and method', async () => {
    const mockResponse = { ok: true, json: () => Promise.resolve({ data: { ipfsHash: 'Qm123' } }) };
    vi.mocked(globalThis.fetch).mockResolvedValue(mockResponse as Response);

    const params = makeUploadParams({ apiUrl: 'https://dev-api.rain.one' });
    await uploadMetaData(params);

    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://dev-api.rain.one/ipfs/upload',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
    );
  });

  it('sends correct metadata in body', async () => {
    const mockResponse = { ok: true, json: () => Promise.resolve({ data: { ipfsHash: 'Qm123' } }) };
    vi.mocked(globalThis.fetch).mockResolvedValue(mockResponse as Response);

    const params = makeUploadParams();
    await uploadMetaData(params);

    const call = vi.mocked(globalThis.fetch).mock.calls[0];
    const body = JSON.parse(call[1]!.body as string);
    expect(body.question).toBe(params.marketQuestion);
    expect(body.options).toEqual(params.marketOptions);
    expect(body.tags).toEqual(params.marketTags);
    expect(body.isPrivate).toBe(!params.isPublic);
    expect(body.isAiResolver).toBe(params.isPublicPoolResolverAi);
    expect(body.poolDescription).toBe(params.marketDescription);
    expect(body.contractData.pool_owner).toBe(params.creator);
    expect(body.contractData.no_of_options).toBe(params.no_of_options);
  });

  it('returns the ipfsHash from response', async () => {
    const mockResponse = { ok: true, json: () => Promise.resolve({ data: { ipfsHash: 'QmABC' } }) };
    vi.mocked(globalThis.fetch).mockResolvedValue(mockResponse as Response);

    const result = await uploadMetaData(makeUploadParams());
    expect(result).toBe('QmABC');
  });

  it('throws when response is not ok', async () => {
    const mockResponse = { ok: false, status: 500, json: () => Promise.resolve({}) };
    vi.mocked(globalThis.fetch).mockResolvedValue(mockResponse as Response);

    await expect(uploadMetaData(makeUploadParams())).rejects.toThrow(
      'Failed to upload metadata: 500'
    );
  });

  it('formats start and end dates as ISO strings', async () => {
    const mockResponse = { ok: true, json: () => Promise.resolve({ data: { ipfsHash: 'Qm123' } }) };
    vi.mocked(globalThis.fetch).mockResolvedValue(mockResponse as Response);

    const startTime = 1700000000;
    const endTime = 1700086400;
    const params = makeUploadParams({ startTime, endTime });
    await uploadMetaData(params);

    const call = vi.mocked(globalThis.fetch).mock.calls[0];
    const body = JSON.parse(call[1]!.body as string);
    expect(body.startDate).toBe(new Date(startTime * 1000).toISOString());
    expect(body.endDate).toBe(new Date(endTime * 1000).toISOString());
  });
});
