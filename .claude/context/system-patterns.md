---
created: 2026-02-05T21:55:26Z
last_updated: 2026-02-05T21:55:26Z
version: 1.0
author: Claude Code PM System
---

# System Patterns

## Architectural Style

**Single-component monolith** - The entire application lives in `Globe.jsx` (~758 lines) with data extracted to `src/data/`. There are no separate utility files, custom hooks, or service layers. This is intentional for simplicity given the focused scope.

## Data Model

### Hierarchical Country → Subdivision

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
```

**Short property names** are used throughout for compact data files:
- `n` = name, `p` = population, `la` = latitude, `lo` = longitude
- `t` = type ("c" or "s"), `al` = aliases, `dn` = density
- `rg` = region, `cp` = capital, `ar` = area, `ch` = change, `ag` = age
- `fp` = FIPS (US), `pc` = province code (Canada), `sc` = state code (Mexico/India)

### Matching Strategies per Country

Each country's subdivisions match to TopoJSON features differently:
- **USA**: FIPS code (`fp`) matched against `f.id` padded to 2 digits
- **Canada**: Province code (`pc` like "CA-ON") matched against `f.properties.id` or `f.id`
- **Mexico**: State code (`sc`) matched against `f.properties.state_code` padded to 2 digits
- **India**: State code (`sc`) matched against `f.properties.st_code` padded to 2 digits

## Design Patterns

### Module-level Lookup Maps
Lookup maps are built once at import time, outside the React component:
```js
var FIPS = {};     // US states by FIPS code
var CA_PROV = {};  // Canadian provinces by province code
var MX_STATE = {}; // Mexican states by state code
var IN_STATE = {}; // Indian states by state code
```

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
```

### Hierarchical Sorted List
The `sorted` useMemo produces a flat array of `{entry, depth}` objects:
- Countries at depth 0, subdivisions at depth 1
- Filtered by search (countries match if name/alias/region/capital matches, or if any subdivision matches)
- Subdivisions shown when parent is expanded OR when search matches subdivisions

### Canvas Texture Pipeline
1. Create 4096x2048 canvas
2. Set up d3 equirectangular projection fitted to canvas size
3. Paint ocean gradient
4. Paint each country (skip countries with subdivision data)
5. Paint each country's subdivisions individually (US states, CA provinces, MX states, IN states)
6. Draw country borders, then subdivision borders for each country
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

## Data Flow

```
countries.js → index.js (computed exports) → Globe.jsx
                                               ├── Fetch 5 TopoJSON sources
                                               ├── Paint canvas texture
                                               ├── Create Three.js scene
                                               ├── Build markers + lookup maps
                                               └── React UI (sidebar, tooltip, detail)
```
