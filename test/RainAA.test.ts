import { describe, it, expect } from 'vitest';
import { RainAA } from '../src/RainAA.js';

// Minimal mock objects sufficient for constructor validation
const mockChain = { id: 42161, name: 'Arbitrum One' } as any;
const mockWalletClient = { type: 'walletClient' } as any;

function makeConfig(overrides: Record<string, any> = {}) {
  return {
    walletClient: mockWalletClient,
    alchemyApiKey: 'test-key',
    paymasterPolicyId: 'test-policy',
    chain: mockChain,
    ...overrides,
  };
}

describe('RainAA constructor', () => {
  it('creates instance with valid config', () => {
    const aa = new RainAA(makeConfig());
    expect(aa).toBeInstanceOf(RainAA);
  });

  it('throws when walletClient is missing', () => {
    expect(() => new RainAA(makeConfig({ walletClient: undefined }))).toThrow(
      'walletClient is required'
    );
  });

  it('throws when alchemyApiKey is missing', () => {
    expect(() => new RainAA(makeConfig({ alchemyApiKey: undefined }))).toThrow(
      'alchemyApiKey is required'
    );
  });

  it('throws when paymasterPolicyId is missing', () => {
    expect(() => new RainAA(makeConfig({ paymasterPolicyId: undefined }))).toThrow(
      'paymasterPolicyId is required'
    );
  });

  it('throws when chain is missing', () => {
    expect(() => new RainAA(makeConfig({ chain: undefined }))).toThrow(
      'chain is required'
    );
  });
});

describe('RainAA.address', () => {
  it('throws before connect is called', () => {
    const aa = new RainAA(makeConfig());
    expect(() => aa.address).toThrow('not connected');
  });
});

describe('RainAA.client', () => {
  it('throws before connect is called', () => {
    const aa = new RainAA(makeConfig());
    expect(() => aa.client).toThrow('not connected');
  });
});

describe('RainAA.disconnect', () => {
  it('resets address and client (they throw again after disconnect)', () => {
    const aa = new RainAA(makeConfig());
    // Should not throw — disconnect is safe to call even before connect
    aa.disconnect();
    expect(() => aa.address).toThrow('not connected');
    expect(() => aa.client).toThrow('not connected');
  });
});

// TODO: Integration test for RainAA.connect() — requires mocking Alchemy
// createSmartWalletClient, WalletClientSigner, and alchemy transport.
// Would test mock wiring, not actual behavior.
