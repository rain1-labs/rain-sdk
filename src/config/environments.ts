export const ALLOWED_ENVIRONMENTS = ["development", "stage", "production"] as const;
export const DEFAULT_RPCS: string[] = [
    "https://arb1.arbitrum.io/rpc",
    "https://arbitrum-one.publicnode.com",
    "https://rpc.sentio.xyz/arbitrum-one"
]

export function getRandomRpc(): string {
    const index = Math.floor(Math.random() * DEFAULT_RPCS.length);
    return DEFAULT_RPCS[index];
}

export const ENV_CONFIG = {
    development: {
        apiUrl: "https://dev-api.rain.one",
        market_factory_address: "0x148DA7F2039B2B00633AC2ab566f59C8a4C86313",
        dispute_initial_timer: 1 * 60
    },

    stage: {
        apiUrl: "https://stg-api.rain.one",
        market_factory_address: "0x6109c9f28FE3Ad84c51368f7Ef2d487ca020c561",
        dispute_initial_timer: 1 * 60
    },

    production: {
        apiUrl: "https://prod-api.rain.one",
        market_factory_address: "0xccCB3C03D9355B01883779EF15C1Be09cf3623F1",
        dispute_initial_timer: 120 * 60
    },
} as const;
