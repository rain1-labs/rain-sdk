# Rain SDK Documentation

## Overview

Rain SDK is designed as a **clean, modular, and extensible TypeScript SDK** for interacting with Rain markets and preparing on-chain transactions.

The SDK is intentionally split into two layers:

* **Rain** → Stateless, public-facing utilities (data fetching, raw transaction builders)
* **RainAA** → Stateful Account Abstraction layer (smart accounts)

---

## Installation

```bash
npm install @rainprotocolsdk/sdk
```

or

```bash
yarn add @rainprotocolsdk/sdk
```

---

### Initialization

```ts
import { Rain } from "@rainprotocolsdk/sdk";

const rain = new Rain();
```

> The constructor is intentionally empty to allow future configuration without breaking changes.

---

## getPublicMarkets

Fetches public market data from the Rain backend.

### Method Signature

```ts
getPublicMarkets(params: GetMarketsParams): Promise<Market[]>;
```

### Parameters

```ts
interface GetMarketsParams {
  limit: number;
  offset: number;
  sortBy?: "Liquidity" | "Volumn" | "latest";
  status?: 'Live' | 'New' | 'WaitingForResult' | 'UnderDispute' | 'UnderAppeal' | 'ClosingSoon' | 'InReview' | 'InEvaluation' | 'Closed' | 'Trading';
}
```

### Example

```ts
const markets = await rain.getPublicMarkets({
  limit?: 12,
  offset?: 1,
  sortBy?: "Liquidity",
  status?: "Live",
});
```

---

## buildApprovalTx

```
Builds a raw ERC20 approval transaction if needed.

This function prepares an unsigned approve(spender, amount) transaction and does not execute it.

If amount is not provided, a default large allowance is approved.
```

### Return Type

```ts
interface RawTransaction {
  to: `0x${string}`;
  data: `0x${string}`;
}
```

### Example

```ts
const approvalTx = rain.buildApprovalTx({ 
  tokenAddress: `0x${string}`, // Approval token address 
  spender: `0x${string}`,  // Market contract address
  amount?: 1000000000000000000n // optional parameter
   });
```

---

## buildCreateMarketTx

Builds a **raw EVM transaction** for creating a market in rain protocol.

This function **does not send the transaction** — it only prepares calldata.

### Method Signature

```ts
buildCreateMarketTx(params: CreateMarketTxParams): RawTransaction;
```

### Parameters

```ts
interface CreateMarketTxParams {
  marketQuestion: string;
  marketOptions: string[];
  marketTags: string[];
  marketDescription: string;
  isPublic: boolean;
  isPublicPoolResolverAi: boolean;
  creator: `0x${string}`;
  startTime: number | bigint;        // Unix timestamp (seconds)
  endTime: number | bigint;          // Must be > startTime
  no_of_options: number;                   // Number of options (> 0)
  ipfsUrl: string;                   // IPFS CID
  inputAmountWei: bigint;            // Initial liquidity (token wei)
  barValues: (number)[];             // Token Distribution values in options in %
  baseToken: `0x${string}`;          // ERC20 token address
  tokenDecimals?: number;            // Optional (default: 6)
}
```

### Validations

| Field                    | Type               | Required | Description                      |
| ------------------------ | ------------------ | -------- | -------------------------------- |
| `marketQuestion`         | `string`          | ✅        | Market question (cannot be empty)|
| `marketOptions`          | `string[]`        | ✅        | List of market options (2 <= 26 ) |
| `marketTags`             | `string[]`        | ✅        | Tags related to the market (1 <= 3  ) |
| `marketDescription`      | `string`          | ✅        | Detailed market description        |
| `isPublic`               | `boolean`          | ✅        | Whether market is public         |
| `isPublicPoolResolverAi` | `boolean`          | ✅        | AI resolver flag                 |
| `creator`                | `0x${string}`      | ✅        | Market creator address           |
| `startTime`              | `number \| bigint` | ✅        | Market start timestamp           |
| `endTime`                | `number \| bigint` | ✅        | Must be greater than `startTime` |
| `no_of_options`          | `number`           | ✅        | Number of market options (> 2)   |
| `ipfsUrl`                | `string`           | ✅        | IPFS CID containing metadata     |
| `inputAmountWei`         | `bigint`           | ✅        | Initial liquidity amount         |
| `barValues`              | `array`            | ✅        | Cannot be empty                  |
| `baseToken`              | `0x${string}`      | ✅        | ERC20 base token address         |
| `tokenDecimals`          | `number`           | ❌        | Defaults to `6`                  |

### Minimum Liquidity Rule

#### inputAmountWei >= 10 tokens

### Return Type

```ts
interface RawTransaction {
  to: `0x${string}`;
  data: `0x${string}`;
}
```

### Example

```ts
rain.buildCreateMarketTx({
    marketQuestion: "Will BTC hit 100k?",
    marketOptions: ["Yes", "No"],
    marketTags: ["crypto", "bitcoin"],
    marketDescription: "Prediction market for BTC price",
    isPublic: true,
    isPublicPoolResolverAi: false,
    creator: "0x996ea23940f4a01610181D04bdB6F862719b63f0",
    startTime: 1770836400,
    endTime: 1770922800,
    options: 3,
    ipfsUrl: "QmUdu2eLEQ2qFtNeVVLfVQDBCoc4DT5752enxDitLGmVec",
    inputAmountWei: 100000000n,
    barValues: [48, 40, 1],
    baseToken: "0xCa4f77A38d8552Dd1D5E44e890173921B67725F4"
  })
```

### Note: 
If the user has not approved the **Rain Factory contract**, the function will return two transactions **(approve + create market)**, but if approval already exists, it will return only one transaction **(create market)**.

### Recommended Execution Pattern

```ts
// 1. Build raw transaction
const rawTx = rain.buildCreateMarketTx[{...}];

// 2. Execute using your provider
await yourProvider.sendTransaction(rawTx[index]);
```

---

## buildBuyOptionRawTx

Builds a **raw EVM transaction** for entering a market option.

This function **does not send the transaction** — it only prepares calldata.

### Method Signature

```ts
buildBuyOptionRawTx(params: EnterOptionTxParams): RawTransaction;
```

### Parameters

```ts
interface EnterOptionTxParams {
  address: `0x${string}`;        // Trademarket contract address
  selectedOption: number;       // Option index
  buyInWei: bigint;              // Amount in wei
}
```

### Return Type

```ts
interface RawTransaction {
  to: `0x${string}`;
  data: `0x${string}`;
}
```

### Example

```ts
const rawTx = rain.buildBuyOptionRawTx({
  address: `0x${string}`,
  selectedOption: 1,
  buyInWei: 1000000000000000000n,
});
```
---

## buildLimitBuyOptionTx

Builds a **raw EVM transaction** for placing a limit buy order on a Rain market.

This function **does not send the transaction** — it only prepares calldata.

### Method Signature

```ts
buildLimitBuyOptionTx(params: EnterLimitOptionTxParams): RawTransaction
```

### Parameters

```ts
interface EnterLimitOptionTxParams {
    marketContractAddress: `0x${string}`; // market contract address
    selectedOption: number; // Option index
    pricePerShare: bigint; // price per share
    buyAmountInWei: bigint; // total buy amount (already converted to token wei)
    tokenDecimals?: number; // token decimals optional (default: `6`)
}
```
### Validations

| Field                   | Type          | Required | Description                                            |
| ----------------------- | ------------- | -------- | ------------------------------------------------------ |
| `marketContractAddress` | `0x${string}` | ✅        | Address of the market contract             |
| `selectedOption`        | `number`      | ✅        | Option index to place the buy order for                |
| `pricePerShare`         | `number`      | ✅        | Limit price per share (between `0` and `1`)            |
| `buyAmountInWei`        | `bigint`      | ✅        | Total amount to spend (already converted to token wei) |
| `tokenDecimals`         | `number`      | ❌        | Token decimals optional (default: `6`)                          |

### Return Type

```ts
interface RawTransaction {
  to: `0x${string}`;
  data: `0x${string}`;
}
```

### Example

```ts
rain.buildLimitBuyOptionTx({
    marketContractAddress: `0x${string}`,
    buyAmountInWei: 1000000,
    pricePerShare: 0.1,
    selectedOption: 1,
  })
```

---

## buildClaimTx

Builds a **raw EVM transaction** to claim the funds from a Rain market.

This function **does not send the transaction** — it only prepares calldata.

### Method Signature

```ts
buildClaimTx(params: ClaimTxParams): Promise<RawTransaction>
```

### Parameters

```ts
interface ClaimTxParams {
  marketId: string;
  walletAddress: `0x${string}`;
}
```

### Validations

| Parameter       | Type          | Required | Description                        |
| --------------- | ------------- | -------- | ---------------------------------- |
| `marketId`      | `string`      | ✅        | Unique identifier of the market    |
| `walletAddress` | `0x${string}` | ✅        | Address of the user claiming funds |

### Return Type

```ts
interface RawTransaction {
  to: `0x${string}`;
  data: `0x${string}`;
}
```

### Example

```ts
rain.buildClaimTx({
  marketId: "698c8f116e985bbfacc7fc01",
  walletAddress: '0x996ea23940f4a01610181D04bdB6F862719b63f0'
})
```

---

## RainAA Class (Account Abstraction)

`RainAA` is responsible for:

* Smart account creation
* Session management (coming soon)
* Gas-sponsored execution (coming soon)
* Transaction submission (coming soon)

> `RainAA` consumes raw transactions generated by `Rain`.

### Conceptual Flow

```ts
Rain (WHAT to do)
   ↓
Raw Transaction
   ↓
RainAA (HOW to execute)
```

## Versioning Policy

Rain SDK follows **Semantic Versioning**:

* **Patch** (`1.0.x`) → Bug fixes
* **Minor** (`1.x.0`) → New features, backward compatible
* **Major** (`x.0.0`) → Breaking API changes

---

## Recommended Usage Pattern

```ts
// 1. Read data / build tx
const rain = new Rain();
const rawTx = rain.buildBuyOptionRawTx(...);

// 2. Execute via your provider
await yourprovider.sendTransaction(rawTx);
```

---

**Rain SDK** is built to scale with both products and protocols.
