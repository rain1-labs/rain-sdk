import { describe, it, expect } from 'vitest';
import { ALLOWED_ENVIRONMENTS, ENV_CONFIG, DEFAULT_RPCS, getRandomRpc } from '../../src/config/environments.js';

describe('ALLOWED_ENVIRONMENTS', () => {
  it('contains exactly development, stage, production', () => {
    expect(ALLOWED_ENVIRONMENTS).toEqual(['development', 'stage', 'production']);
  });
});

describe('ENV_CONFIG', () => {
  it('has config for every allowed environment', () => {
    for (const env of ALLOWED_ENVIRONMENTS) {
      expect(ENV_CONFIG[env]).toBeDefined();
      expect(ENV_CONFIG[env].apiUrl).toMatch(/^https:\/\//);
      expect(ENV_CONFIG[env].market_factory_address).toMatch(/^0x[a-fA-F0-9]{40}$/);
      expect(typeof ENV_CONFIG[env].dispute_initial_timer).toBe('number');
    }
  });

  it('development uses dev-api.rain.one', () => {
    expect(ENV_CONFIG.development.apiUrl).toBe('https://dev-api.rain.one');
  });

  it('stage uses stg-api.rain.one', () => {
    expect(ENV_CONFIG.stage.apiUrl).toBe('https://stg-api.rain.one');
  });

  it('production uses prod-api.rain.one', () => {
    expect(ENV_CONFIG.production.apiUrl).toBe('https://prod-api.rain.one');
  });

  it('production dispute timer is 120 minutes', () => {
    expect(ENV_CONFIG.production.dispute_initial_timer).toBe(120 * 60);
  });

  it('dev and stage dispute timers are 1 minute', () => {
    expect(ENV_CONFIG.development.dispute_initial_timer).toBe(60);
    expect(ENV_CONFIG.stage.dispute_initial_timer).toBe(60);
  });
});

describe('DEFAULT_RPCS', () => {
  it('has at least one RPC URL', () => {
    expect(DEFAULT_RPCS.length).toBeGreaterThanOrEqual(1);
  });

  it('all entries are valid URLs', () => {
    for (const rpc of DEFAULT_RPCS) {
      expect(rpc).toMatch(/^https:\/\//);
    }
  });
});

describe('getRandomRpc', () => {
  it('returns a string from DEFAULT_RPCS', () => {
    const rpc = getRandomRpc();
    expect(DEFAULT_RPCS).toContain(rpc);
  });

  it('returns a string each time', () => {
    for (let i = 0; i < 20; i++) {
      expect(typeof getRandomRpc()).toBe('string');
    }
  });
});
