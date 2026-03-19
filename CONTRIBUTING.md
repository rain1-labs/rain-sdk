# Contributing to Rain SDK

Thanks for taking the time to contribute.

## Workflow

1. Fork the repo and clone your fork
2. Create a feature branch from `main`:
   ```bash
   git checkout -b fix/your-fix-name
   # or
   git checkout -b feat/your-feature-name
   ```
3. Make your changes
4. Build to verify no TypeScript errors:
   ```bash
   npm run build
   ```
5. Run tests:
   ```bash
   npm test
   ```
6. Commit with a clear message (see format below)
7. Push your branch and open a PR against `buidlrrr/rain-sdk:main`

## Commit Format

```
type: short description

- detail if needed
- another detail
```

Types: `fix`, `feat`, `docs`, `refactor`, `test`, `chore`

## PR Guidelines

- One concern per PR — keep it focused
- All existing tests must pass (the 22 failures in `createMarketValidation.test.ts` are pre-existing and unrelated)
- Add or update tests for any new behaviour
- Update `CHANGELOG.md` under an `[Unreleased]` section
- Build output (`dist/`) should be committed — the package is published from `dist`

## Project Structure

```
src/
  Rain.ts          — stateless data + tx builder class
  RainAA.ts        — smart account (AA) class, optional peer deps
  index.ts         — main entry point (Rain + types)
  markets/         — market query methods
  positions/       — position/portfolio methods
  tx/              — transaction builders
  accounts/        — account balance methods
  transactions/    — tx history methods
  priceHistory/    — OHLC analytics
  pnl/             — P&L analytics
  leaderboard/     — leaderboard
  socket/          — RainSocket (real-time events via socket.io)
  websocket/       — WebSocket subscriptions (on-chain events)
  utils/           — multicall, websocket helpers
  auth/            — login helpers
test/              — vitest unit tests mirroring src/ structure
dist/              — compiled output (committed)
```

## Peer Dependencies

The SDK has two tiers of peer deps:

- **Required**: `viem ^2.0.0` — needed for all usage
- **Optional (AA only)**: `@alchemy/aa-core`, `@account-kit/infra`, `@account-kit/wallet-client`, `@account-kit/smart-contracts`, `@alchemy/aa-alchemy` — only needed if using `RainAA`

If you add new AA functionality, keep it behind dynamic imports in `RainAA.ts` so non-AA users are not affected.
