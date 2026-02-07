---
created: 2026-02-05T21:55:26Z
last_updated: 2026-02-06T20:37:15Z
version: 1.3
author: Claude Code PM System
---

# System Patterns

## Architectural Style

**Single-component monolith** - The entire application lives in `Globe.jsx` (~860+ lines) with data extracted to `src/data/` and WebGPU compute shaders in `src/webgpu/`. There are no separate utility files, custom hooks, or service layers beyond the compute module. This is intentional for simplicity given the focused scope.

## Data Model

### Hierarchical Country → Subdivision → County

```
Country (t:"c")
├── n, p, la, lo          # name, population, lat, lon
├── iso, al               # ISO code, aliases array
├── subdivisionLabel      # "State", "Province", "Prefecture", etc.
└── subdivisions[]        # array of Subdivision objects
    └── Subdivision (t:"s")
        ├── n, p, la, lo  # name, population, lat, lon
        ├── parentIso     # link to parent country ISO
        ├── dn, rg, cp    # density, region, capital
        ├── ar, ch, ag    # area, change%, median age
        └── fp/pc/sc      # matching code (varies by country)

County (t:"county")       # Third-level, lazy-loaded for US states
├── n, p, la, lo          # name, population, lat, lon
├── parentFp, parentIso   # link to parent state FIPS and country ISO
├── dn, rg, ar, ch        # density, region, area, change%
└── fips                   # 5-digit county FIPS code
```

**Short property names** are used throughout for compact data files:
- `n` = name, `p` = population, `la` = latitude, `lo` = longitude
- `t` = type ("c", "s", or "county"), `al` = aliases, `dn` = density
- `rg` = region, `cp` = capital, `ar` = area, `ch` = change, `ag` = age
- `fp` = FIPS code (US states), `pc` = province code (Canada), `sc` = state code (Mexico/India)
- `fips` = 5-digit FIPS (US counties), `parentFp` = parent state FIPS, `parentIso` = parent country ISO

### Data-Driven Subdivision Configuration (SUB_CONFIGS)

Subdivision handling is fully data-driven via `SUB_CONFIGS` array in `index.js`. Each config specifies:
```js
{
  iso: "BRA",                    // Country ISO code
  url: "/topo/br-states.json",   // TopoJSON source (CDN or local)
  objectName: "ne_10m_admin_1...",// Object key in TopoJSON
  codeField: "sc",               // Property name on subdivision data (fp/pc/sc)
  extractCode: function(f) {},   // Extract matching code from TopoJSON feature
  skipName: "Brazil",            // Country name to skip in world painting
  skipFeature: function(f) {}    // Optional: filter out specific features
}
```

Globe.jsx iterates `SUB_CONFIGS` generically for:
1. Building lookup maps per country
2. Fetching all TopoJSON sources in parallel
3. Painting subdivisions on the canvas texture
4. Drawing subdivision borders

This replaced per-country hardcoded logic (FIPS, CA_PROV, MX_STATE, IN_STATE maps).

### County Configuration (COUNTY_CONFIG)

County-level data uses a separate config from SUB_CONFIGS since it adds a third hierarchy level:
```js
var COUNTY_CONFIG = {
  topoUrl: "https://cdn.jsdelivr.net/npm/us-atlas@3/counties-10m.json",
  objectName: "counties",
  extractCode: function(f) { return String(f.id); },
  extractStateFips: function(f) { return String(f.id).substring(0, 2); }
};
```

County data is lazy-loaded via `COUNTY_FILE_MAP` in `src/data/us-counties/index.js`:
```js
var COUNTY_FILE_MAP = {
  "06": function() { return import("./06.js"); },
  // ... one entry per state FIPS
};
```

### TopoJSON Sources
- **CDN-hosted**: USA (us-atlas states), Canada (Brideau gist), Mexico (diegovalle gist), India (india-maps-data), China (cn-atlas)
- **CDN lazy-loaded**: US counties (us-atlas counties-10m.json, loaded on first state expansion)
- **Local files** (`public/topo/`): Brazil, Colombia, Peru, Argentina, Venezuela, Chile, Ecuador, Bolivia, Paraguay, Uruguay, Guyana, Suriname, French Guiana, Indonesia, Pakistan, Nigeria, Bangladesh, Russia
- **geoBoundaries** (`public/topo/bd-divisions.json`): Bangladesh (used instead of Natural Earth which is missing Mymensingh division)

## Design Patterns

### Pre-create and Toggle Visibility
All subdivision markers are created during initial data load but set to `visible: false`. Expanding a country toggles visibility without creating/destroying Three.js objects.

### Ref-based Marker Registry
```js
mkRef.current = {
  m: countryMarkers,       // always-visible country markers
  dm: dataMap,             // Three.js mesh.id → data object
  subMarkers: Map<iso, Mesh[]>  // per-country subdivision markers
};
visibleMkRef.current = [...];   // rebuilt on expand state change
countyMkRef.current = Map<stateFips, Mesh[]>;  // county markers per state
countyTopoRef.current = { loaded: false, data: null, promise: null };  // cached county topology
```

### Dynamic County Markers
County markers are created/destroyed dynamically (unlike subdivision markers which are pre-created):
- Created when a US state is expanded to county level
- Smaller size and lighter blue color (`0xaaddff`) than state markers
- Stored in `countyMkRef` Map keyed by state FIPS
- Disposed and removed from `visibleMkRef` when state is collapsed

### Hierarchical Sorted List
The `sorted` useMemo produces a flat array of `{entry, depth}` objects:
- Countries at depth 0, subdivisions at depth 1, counties at depth 2
- Filtered by search (countries match if name/alias/region/capital matches, or if any subdivision matches)
- Subdivisions shown when parent is expanded OR when search matches subdivisions
- Counties shown when parent state is expanded via `expandedStates`

### Canvas Texture Pipeline
1. Create 4096x2048 canvas
2. Set up d3 equirectangular projection fitted to canvas size
3. Paint ocean gradient
4. Paint each country (skip countries listed in SUB_CONFIGS `skipName`)
5. For each SUB_CONFIGS entry: paint subdivisions individually using lookup maps
6. Draw country borders, then subdivision borders for each SUB_CONFIGS entry
7. Draw graticule
8. Convert canvas to Three.js CanvasTexture → apply to sphere

### Population Color Scale
```js
function pClr(pop) {
  var t = Math.pow(pop / MP, 0.3);  // power scale normalization
  // 6-stop gradient: dark blue → teal → green → yellow → orange → red
}
```

## Code Style

### ES5 JavaScript Throughout
- `var` instead of `let`/`const`
- `function()` instead of arrow functions
- `for` loops instead of `.map()` in performance-sensitive areas
- No destructuring, template literals, or modern syntax

### Inline Styles
All CSS is written as inline React style objects. No CSS modules, styled-components, or external stylesheets for the Globe component.

### Error Handling
- Try/catch around Three.js initialization
- Promise.catch for TopoJSON fetch failures
- User-visible error state via `setErr()`
- `dead` flag prevents state updates after unmount

### WebGPU Compute Pattern
```js
// Feature detection with fallback
var device = await initGPU();
if (!device) return cpuFallback();

// GPU pipeline: create buffers → write data → create pipeline → dispatch → read back
var paramsBuffer = device.createBuffer({ ... });
device.queue.writeBuffer(paramsBuffer, 0, data);
var pipeline = device.createComputePipeline({ layout: "auto", compute: { module, entryPoint: "main" } });
// ... dispatch, copy, mapAsync, read result
```

Two WGSL compute shaders:
1. **HEAT_MAP_SHADER** - Population to RGBA color (workgroup_size 256, parallelized per county)
2. **ARC_TRANSFORM_SHADER** - Sequential delta-decode + transform (workgroup_size 1, prefix sum)

## Data Flow

```
countries.js → index.js (computed exports + SUB_CONFIGS + COUNTY_CONFIG) → Globe.jsx
                                                            ├── Fetch world TopoJSON + all SUB_CONFIGS URLs
                                                            ├── Build per-country lookup maps from SUB_CONFIGS
                                                            ├── Paint canvas texture (generic subdivision loop)
                                                            ├── Create Three.js scene + markers
                                                            ├── React UI (sidebar, tooltip, detail)
                                                            └── On state expand:
                                                                ├── Lazy-load county data (COUNTY_FILE_MAP)
                                                                ├── Lazy-load county topology (COUNTY_CONFIG)
                                                                ├── Create county markers dynamically
                                                                └── Draw county boundaries on highlight canvas

us-counties/index.js → COUNTY_FILE_MAP → dynamic import per state
webgpu/county-compute.js → GPU compute (optional) → typed array results
```
