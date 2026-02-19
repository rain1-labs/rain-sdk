import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockMulticall, mockCreatePublicClient } = vi.hoisted(() => {
  const mockMulticall = vi.fn();
  const mockCreatePublicClient = vi.fn(() => ({ multicall: mockMulticall }));
  return { mockMulticall, mockCreatePublicClient };
});

vi.mock('viem', async () => {
  const actual = await vi.importActual<typeof import('viem')>('viem');
  return {
    ...actual,
    createPublicClient: mockCreatePublicClient,
  };
});

import { createRpcClient, multicallRead } from '../../src/utils/multicall.js';
import {
  ADDR_TOKEN,
  ADDR_ALICE,
  RPC_URL,
  makeMulticallContracts,
} from '../helpers/fixtures.js';

describe('createRpcClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns an object with a multicall method', () => {
    const client = createRpcClient(RPC_URL);
    expect(client).toHaveProperty('multicall');
    expect(typeof client.multicall).toBe('function');
  });

  it('calls createPublicClient with arbitrum chain', () => {
    createRpcClient(RPC_URL);
    expect(mockCreatePublicClient).toHaveBeenCalledWith(
      expect.objectContaining({
        chain: expect.objectContaining({ id: 42161 }),
      }),
    );
  });

  it('passes rpcUrl to http transport', () => {
    createRpcClient(RPC_URL);
    expect(mockCreatePublicClient).toHaveBeenCalledWith(
      expect.objectContaining({
        transport: expect.anything(),
      }),
    );
  });
});

describe('multicallRead', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls client.multicall with the contracts array', async () => {
    const contracts = makeMulticallContracts();
    mockMulticall.mockResolvedValue([
      { result: 1000n, status: 'success' },
      { result: 6, status: 'success' },
    ]);

    await multicallRead(RPC_URL, [...contracts]);

    expect(mockMulticall).toHaveBeenCalledWith({ contracts: [...contracts] });
  });

  it('returns results in same order as input', async () => {
    const contracts = makeMulticallContracts();
    const expected = [
      { result: 1000n, status: 'success' },
      { result: 6, status: 'success' },
    ];
    mockMulticall.mockResolvedValue(expected);

    const results = await multicallRead(RPC_URL, [...contracts]);

    expect(results).toEqual(expected);
    expect(results[0]).toEqual({ result: 1000n, status: 'success' });
    expect(results[1]).toEqual({ result: 6, status: 'success' });
  });

  it('handles mixed success/failure results', async () => {
    const contracts = makeMulticallContracts();
    const expected = [
      { result: 1000n, status: 'success' },
      { result: undefined, error: new Error('revert'), status: 'failure' },
    ];
    mockMulticall.mockResolvedValue(expected);

    const results = await multicallRead(RPC_URL, [...contracts]);

    expect(results[0].status).toBe('success');
    expect(results[1].status).toBe('failure');
  });

  it('handles empty contracts array', async () => {
    mockMulticall.mockResolvedValue([]);

    const results = await multicallRead(RPC_URL, []);

    expect(mockMulticall).toHaveBeenCalledWith({ contracts: [] });
    expect(results).toEqual([]);
  });

  it('propagates errors from multicall', async () => {
    const contracts = makeMulticallContracts();
    mockMulticall.mockRejectedValue(new Error('RPC error'));

    await expect(multicallRead(RPC_URL, [...contracts])).rejects.toThrow('RPC error');
  });

  it('creates a new client for each call', async () => {
    mockMulticall.mockResolvedValue([]);

    await multicallRead(RPC_URL, []);
    await multicallRead('https://other-rpc.com', []);

    expect(mockCreatePublicClient).toHaveBeenCalledTimes(2);
  });
});
