import fs from 'node:fs';
import path from 'node:path';
import { createWalletClient, createPublicClient, http, type WalletClient, type PublicClient, type Hash, type TransactionReceipt } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { arbitrum } from 'viem/chains';
import { Rain } from '../src/index.js';

// ── Load .env (optional — missing file is OK for read-only scripts) ────────

function loadEnv(): Record<string, string> {
  const envPath = path.resolve(import.meta.dirname, '..', '.env');
  if (!fs.existsSync(envPath)) return {};
  const vars: Record<string, string> = {};
  for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let value = trimmed.slice(eqIdx + 1).trim();
    // strip inline comments
    const commentIdx = value.indexOf('#');
    if (commentIdx !== -1) value = value.slice(0, commentIdx).trim();
    vars[key] = value;
  }
  return vars;
}

const env = loadEnv();
const rpcUrl = env.TEST_RPC_URL || undefined;

// ── SDK (always available) ─────────────────────────────────────────────────

export const rain = new Rain({
  environment: 'development',
  ...(rpcUrl ? { rpcUrl } : {}),
});

// ── Wallet setup (lazy — only required by scripts that send txs) ───────────

let _walletClient: WalletClient | undefined;
let _publicClient: PublicClient | undefined;
let _walletAddress: `0x${string}` | undefined;

function requireWallet() {
  if (_walletClient) return;

  const privateKey = env.TEST_PRIVATE_KEY;
  if (!privateKey || !privateKey.startsWith('0x') || privateKey === '0x...') {
    console.error(
      'TEST_PRIVATE_KEY is missing or invalid.\n' +
      'Copy .env.example → .env and fill in a funded Arbitrum wallet key.'
    );
    process.exit(1);
  }

  const account = privateKeyToAccount(privateKey as `0x${string}`);
  const transport = http(rpcUrl || 'https://arb1.arbitrum.io/rpc');

  _walletClient = createWalletClient({ account, chain: arbitrum, transport });
  _publicClient = createPublicClient({ chain: arbitrum, transport });
  _walletAddress = account.address;
}

export function getWalletClient(): WalletClient {
  requireWallet();
  return _walletClient!;
}

export function getPublicClient(): PublicClient {
  requireWallet();
  return _publicClient!;
}

export function getWalletAddress(): `0x${string}` {
  requireWallet();
  return _walletAddress!;
}

/** Returns wallet address if .env is configured, undefined otherwise. Does not exit. */
export function tryGetWalletAddress(): `0x${string}` | undefined {
  const privateKey = env.TEST_PRIVATE_KEY;
  if (!privateKey || !privateKey.startsWith('0x') || privateKey === '0x...') return undefined;
  requireWallet();
  return _walletAddress;
}

// ── Helpers ────────────────────────────────────────────────────────────────

export function log(label: string, data?: unknown) {
  console.log(`\n[${label}]`);
  if (data !== undefined) {
    console.log(typeof data === 'object' ? JSON.stringify(data, replacer, 2) : data);
  }
}

/** JSON replacer that serializes bigints as strings */
function replacer(_key: string, value: unknown): unknown {
  return typeof value === 'bigint' ? value.toString() : value;
}

export function assert(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

export async function waitForTx(hash: Hash): Promise<TransactionReceipt> {
  const publicClient = getPublicClient();
  log('Waiting for tx', hash);
  const receipt = await publicClient.waitForTransactionReceipt({ hash, timeout: 60_000 });
  if (receipt.status === 'reverted') {
    throw new Error(`Transaction reverted: ${hash}`);
  }
  log('Tx confirmed', { hash, blockNumber: receipt.blockNumber.toString(), gasUsed: receipt.gasUsed.toString() });
  return receipt;
}

// ERC-20 balanceOf ABI for on-chain reads
export const erc20BalanceOfAbi = [
  {
    type: 'function',
    name: 'balanceOf',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
] as const;
