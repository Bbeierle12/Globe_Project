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
