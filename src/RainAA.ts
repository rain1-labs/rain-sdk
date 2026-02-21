import { custom, createWalletClient } from 'viem';
import { WalletClientSigner } from '@alchemy/aa-core';
import { alchemy } from "@account-kit/infra";
import { createSmartWalletClient } from "@account-kit/wallet-client";

import { RainConfig } from './types.js';
import { RawTransaction } from './tx/types.js';

export class RainAA {
    private config: RainConfig;
    private _client: any | null = null;
    private _address: `0x${string}` | null = null;

    constructor(config: RainConfig) {
        if (!config.walletClient) throw new Error('walletClient is required');
        if (!config.alchemyApiKey) throw new Error('alchemyApiKey is required');
        if (!config.paymasterPolicyId) throw new Error('paymasterPolicyId is required');
        if (!config.chain) throw new Error('chain is required');
        this.config = config;
    }

    /**
     * Initializes the Smart Account
     */
    async connect(): Promise<`0x${string}`> {
        if (this._address && this._client) {
            return this._address;
        }

        try {
            const signer = new WalletClientSigner(
                createWalletClient({
                    transport: custom(this.config.walletClient),
                }) as any,
                'wallet'
            );

            const client = createSmartWalletClient({
                chain: this.config.chain as any,
                signer: signer as any,
                policyId: this.config.paymasterPolicyId,
                transport: alchemy({
                    apiKey: this.config.alchemyApiKey,
                    nodeRpcUrl: this.config.rpcUrl,
                } as any),
            });

            const account = await client.requestAccount();

            if (!account?.address) {
                throw new Error('Failed to create smart account');
            }

            this._client = client;
            this._address = account.address;

            return account.address;
        } catch (err) {
            console.error('[Rain SDK] connect failed:', err);
            throw err;
        }
    }


    /**
     * Returns smart account address
     */
    get address() {
        if (!this._address) {
            throw new Error('Rain not connected. Call rain.connect() first.');
        }
        return this._address;
    }

    /**
     * Returns smart account client
     */
    get client() {
        if (!this._client) {
            throw new Error('Rain not connected. Call rain.connect() first.');
        }
        return this._client;
    }

    /**
     * Sends a raw transaction from the smart account.
     */
    async sendTransaction(rawTx: RawTransaction): Promise<`0x${string}`> {
        if (!this._client) {
            throw new Error('Rain not connected. Call rain.connect() first.');
        }
        const hash = await this._client.sendTransaction({
            to: rawTx.to,
            data: rawTx.data,
            value: rawTx.value,
        });
        return hash;
    }

    /**
     * Reset connection (optional)
     */
    disconnect() {
        this._client = null;
        this._address = null;
    }
}
