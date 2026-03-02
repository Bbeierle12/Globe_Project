# Globe Project

This project keeps the existing React + Vite frontend unchanged.

## Frontend

- Install dependencies: `npm ci`
- Start dev server: `npm run dev`
- Run tests: `npm run test`
- Build: `npm run build`

## Rust tooling

Population-stat generation has been migrated to Rust.

- Run: `cargo run --manifest-path rust/compute_pop/Cargo.toml`
- Test: `cargo test --manifest-path rust/compute_pop/Cargo.toml`

### Rust FFI (O3DE bridge)

- Build: `cargo build --release --manifest-path rust/globe_ffi/Cargo.toml`
- Test: `cargo test --manifest-path rust/globe_ffi/Cargo.toml`
- Lint: `cargo clippy --manifest-path rust/globe_ffi/Cargo.toml -- -D warnings`
- Format check: `cargo fmt --manifest-path rust/globe_ffi/Cargo.toml -- --check`

## O3DE Desktop Application

The O3DE project lives in `o3de/GlobeProject/` and contains the following Gems:

| Gem | Purpose |
|-----|---------|
| **GlobePopulation** | Population data layer (Rust FFI bridge) |
| **GlobeLayers** | Layer registry (toggle, visibility, lifetime) |
| **GlobeOsintFeeds** | External data feeds (USGS earthquakes) |
| **GlobeUI** | ImGui panels (search, detail, layer toggles) |

## Token Security

### Setup

1. Copy the template setreg to your user-local settings:
   ```
   o3de/GlobeProject/user/Registry/GlobeProject.setreg
   ```
2. Fill in your token values. This file is gitignored and never committed.

Alternatively, set environment variables:
- `CESIUM_ION_TOKEN` — Cesium Ion access token
- `GOOGLE_MAPS_API_KEY` — Google Maps API key

### Best Practices

- **Public scopes only** — shipped client tokens should only have read access to public assets
- **Restrict to needed asset IDs** — create separate tokens scoped to specific Ion asset IDs
- **Separate tokens** for data queries vs CesiumForO3DE rendering
- **Rotate tokens** periodically (at least quarterly); update the setreg file after rotation
- **Never commit tokens** — the `user/` directory is gitignored
- **No token = warning, no crash** — the app gracefully degrades when tokens are missing

## Test Matrix

The project uses four independent test tiers. All run in CI (`.github/workflows/ci.yml`).

| Tier | Runner | Command | What it covers |
|------|--------|---------|----------------|
| **Rust FFI** | `cargo test` | `cargo test --manifest-path rust/globe_ffi/Cargo.toml` | FFI bridge, population queries, string formatting, JSON parsing |
| **O3DE Gems** | AzTest | `cmake --build build --target GlobePopulation.Tests` | EBus wiring, subdivision access, Ion API JSON parsing, layer registry, feed parsing |
| **JS Unit** | Vitest | `npm run test:coverage` | React components, config modules, data utils |
| **JS E2E** | Playwright | `npm run test:e2e` | Full browser render, globe interaction, layer toggles |

### Running locally

```bash
# Rust FFI tests
cargo test --manifest-path rust/globe_ffi/Cargo.toml

# JS unit tests with coverage
npm run test:coverage

# JS E2E tests (requires build first)
npm run build && npm run test:e2e

# O3DE Gem tests (requires CMake build)
cd o3de/GlobeProject
cmake --build build --target GlobePopulation.Tests
ctest --test-dir build --output-on-failure
```
