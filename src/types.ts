import { WalletClient } from 'viem';
import { Chain } from 'viem/chains';

export interface RainConfig {
  walletClient: WalletClient;
  alchemyApiKey?: string;
  paymasterPolicyId?: string;
  chain: Chain;
  rpcUrl?: string;
}

export type RainEnvironment = "development" | "stage" | "production";
export interface RainCoreConfig {
  environment?: RainEnvironment;
}

