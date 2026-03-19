# Changelog

## [1.1.1] - 2026-03-19

### Fixed

- **`RainAA` now uses dynamic imports** for `@alchemy/aa-core`, `@account-kit/infra`, and `@account-kit/wallet-client`. Previously, importing anything from `@buidlrrr/rain-sdk` would eagerly load all AA peer dependencies at module load time — even in apps that only use `Rain`. This caused two classes of startup crashes in Node.js apps:
  - `ERR_PACKAGE_PATH_NOT_EXPORTED` — due to `@account-kit/wallet-client` bundling a nested `viem@2.29.2` that conflicts with the host app's viem
  - `SyntaxError: The requested module 'viem/chains' does not provide an export named 'hyperliquid'` — same root cause, different symptom depending on Node version

  AA deps now only load when `RainAA.connect()` is actually called.

- **Added `@account-kit/smart-contracts` to `peerDependencies`** (optional). It is a hard transitive dependency of `@account-kit/wallet-client` but was missing from the manifest, causing `ERR_MODULE_NOT_FOUND` for apps that installed all other peer deps correctly.

### Added

- **`./aa` export path** — `RainAA` can now be imported directly via `import { RainAA } from '@buidlrrr/rain-sdk/aa'` for explicit opt-in without touching the main entry point.

## [1.1.0] - prior

- Initial public release with `Rain`, `RainAA`, `RainSocket`
