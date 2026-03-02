# globe_desktop — RETIRED

> **Status**: Frozen as of June 2025.  
> **Successor**: O3DE `GlobeProject` (see `o3de/GlobeProject/`).

## Why this crate is retired

`globe_desktop` was the original Bevy-based prototype for rendering a 3-D
globe with population overlays. All of its features have been ported to O3DE
Gems:

| globe_desktop feature | O3DE replacement |
|---|---|
| Population heatmap / markers | `GlobePopulation` Gem (Rust FFI via `globe_ffi`) |
| Layer visibility toggle | `GlobeLayers` Gem |
| Earthquake OSINT feed | `GlobeOsintFeeds` Gem |
| Cesium Ion REST API (`ion_api.rs`) | `GlobePopulation/Utils/IonApiClient.h/.cpp` |
| ImGui debug panels | `GlobeUI` Gem |
| Token management | `GlobePopulation/Utils/TokenLoader.h` + `.setreg` |

## Can I still build it?

Yes — the code compiles and runs. It is kept for reference only.

```bash
cd rust/globe_desktop
cargo build --release
```

No new features will be added here. Bug-fix PRs are accepted only if they
affect the shared `globe_ffi` crate.

## What to use instead

```bash
# Build the O3DE project
cd o3de/GlobeProject
cmake --preset default
cmake --build build
```

See the top-level `README.md` for full setup instructions.
