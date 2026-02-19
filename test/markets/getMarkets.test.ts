import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getMarkets } from '../../src/markets/getMarkets.js';

describe('getMarkets', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('throws when apiUrl is missing', async () => {
    await expect(getMarkets({})).rejects.toThrow('api url is missing');
  });

  it('calls fetch with correct base URL', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    } as any);

    await getMarkets({ apiUrl: 'https://dev-api.rain.one' });

    const calledUrl = vi.mocked(globalThis.fetch).mock.calls[0][0] as string;
    expect(calledUrl).toContain('https://dev-api.rain.one/pools/public-pools');
  });

  it('appends limit query param', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    } as any);

    await getMarkets({ apiUrl: 'https://dev-api.rain.one', limit: 10 });

    const calledUrl = vi.mocked(globalThis.fetch).mock.calls[0][0] as string;
    expect(calledUrl).toContain('limit=10');
  });

  it('appends offset query param', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    } as any);

    await getMarkets({ apiUrl: 'https://dev-api.rain.one', offset: 5 });

    const calledUrl = vi.mocked(globalThis.fetch).mock.calls[0][0] as string;
    expect(calledUrl).toContain('offset=5');
  });

  it('maps sortBy to backend field name', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    } as any);

    await getMarkets({ apiUrl: 'https://dev-api.rain.one', sortBy: 'Liquidity' });

    const calledUrl = vi.mocked(globalThis.fetch).mock.calls[0][0] as string;
    expect(calledUrl).toContain('sortBy=totalLiquidity');
  });

  it('maps status to backend field name', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    } as any);

    await getMarkets({ apiUrl: 'https://dev-api.rain.one', status: 'Closed' });

    const calledUrl = vi.mocked(globalThis.fetch).mock.calls[0][0] as string;
    expect(calledUrl).toContain('status=Closed');
  });

  it('does not include undefined params in query', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    } as any);

    await getMarkets({ apiUrl: 'https://dev-api.rain.one' });

    const calledUrl = vi.mocked(globalThis.fetch).mock.calls[0][0] as string;
    expect(calledUrl).not.toContain('limit=');
    expect(calledUrl).not.toContain('offset=');
    expect(calledUrl).not.toContain('sortBy=');
    expect(calledUrl).not.toContain('status=');
  });

  it('returns parsed JSON data', async () => {
    const mockMarkets = [
      { id: '1', title: 'Market 1', totalVolume: '1000', status: 'Live' },
    ];
    vi.mocked(globalThis.fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockMarkets),
    } as any);

    const result = await getMarkets({ apiUrl: 'https://dev-api.rain.one' });
    expect(result).toEqual(mockMarkets);
  });

  it('throws when response is not ok', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue({
      ok: false,
      status: 503,
    } as any);

    await expect(
      getMarkets({ apiUrl: 'https://dev-api.rain.one' })
    ).rejects.toThrow('Failed to fetch markets: 503');
  });
});
