---
created: 2026-02-05T21:55:26Z
last_updated: 2026-02-06T22:06:41Z
version: 2.0
author: Claude Code PM System
---

# System Patterns

## Architectural Style

**Multi-component CesiumJS application** - The application is split across several focused modules:
- `App.jsx` (~120 lines) - State management hub
- `CesiumGlobe.jsx` (~399 lines) - CesiumJS viewer lifecycle and interactions
- `Sidebar.jsx` (~602 lines) - Search, list, and detail panel UI
- `Tooltip.jsx` (~65 lines) - Hover tooltip overlay
- `src/cesium/` (5 files) - Modular CesiumJS setup (terrain, population, cities, buildings, topo utils)
- `src/data/` (unchanged) - All population/country/subdivision data

CesiumJS is used directly (not via Resium) because Resium has a runtime crash on React 19 ([issue #689](https://github.com/reearth/resium/issues/689)).

## Data Model

### Hierarchical Country > Subdivision > County

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

`populationLayer.js` iterates `SUB_CONFIGS` generically for:
1. Building lookup maps per country
2. Fetching all TopoJSON sources in parallel
3. Creating GeoJSON entities with per-subdivision population coloring
4. Drawing subdivision borders as terrain-clamped polygons

### County Configuration (COUNTY_CONFIG)

County-level data uses a separate config since it adds a third hierarchy level:
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

## Design Patterns

### CesiumJS Viewer Lifecycle (useRef + useEffect)
```js
var viewerRef = useRef(null);
useEffect(function() {
  var dead = false;
  async function init() {
    var viewer = new Cesium.Viewer(mountRef.current, { ... });
    viewerRef.current = viewer;
    // ... setup layers, handlers, listeners
  }
  init();
  return function() {
    dead = true;
    // cleanup: remove listeners, destroy handler, destroy layers, destroy viewer
  };
}, []);
```

All Cesium UI widgets disabled; custom React sidebar/tooltip used instead.

### Pre-create and Toggle Visibility
All subdivision markers are created during initialization but set to `show: false`. Expanding a country toggles `entity.show` without creating/destroying CesiumJS entities.

### Ref-based Marker Registry
```js
markersRef.current = {
  country: [],                        // always-visible country point entities
  subdivisionsByIso: Map<iso, Entity[]>, // per-country subdivision entities
  countiesByFp: Map<stateFips, Entity[]>, // county entities per state
};
layersRef.current = {
  population: null,   // GeoJsonDataSource wrapper
  cities: null,       // city layer wrapper
  buildings: null,    // Cesium3DTileset
};
```

### Dynamic County Markers
County markers are created dynamically when a US state is expanded (unlike subdivision markers which are pre-created). Stored in `countiesByFp` Map, visibility toggled via `expandedStates`.

### Hierarchical Sorted List
The `sorted` useMemo in Sidebar.jsx produces a flat array of `{entry, depth}` objects:
- Countries at depth 0, subdivisions at depth 1, counties at depth 2
- Filtered by search (countries match if name/alias/region/capital matches, or if any subdivision matches)
- Subdivisions shown when parent is expanded OR when search matches subdivisions
- Counties shown when parent state is expanded via `expandedStates`

### Population Color Scale
```js
function pClr(pop) {
  var t = Math.pow(pop / MP, 0.3);  // power scale normalization
  // 6-stop gradient: dark blue → teal → green → yellow → orange → red
  // Returns {r, g, b} object, converted to Cesium.Color.fromBytes() for entities
}
```

### GeoJSON Population Overlay Pipeline
1. Fetch world TopoJSON + all 23 SUB_CONFIGS URLs in parallel via `Promise.all`
2. Decode each TopoJSON to GeoJSON via custom `decodeTopo()` function
3. Load as `Cesium.GeoJsonDataSource` with `clampToGround: true`
4. Per-entity coloring via `pClr()` population color function
5. Outlines disabled (unsupported on terrain-clamped entities)
6. Stroke set to transparent to prevent RangeError on complex polygons
7. Selection highlighting via material brightness change

### Camera-Based Layer Visibility
```js
viewer.camera.changed.addEventListener(function() {
  var height = viewer.camera.positionCartographic.height;
  populationLayer.setSubdivisionsVisible(height < 12000000);
  buildings.show = height < 1800000;
});
```

### City Labels with Distance-Based LOD
City point + label entities use `distanceDisplayCondition` and `scaleByDistance` (`NearFarScalar`) so labels only appear when zoomed in close enough.

### requestRenderMode Performance
`requestRenderMode: true` with `maximumRenderTimeChange: Infinity` means CesiumJS only renders when explicitly requested via `scene.requestRender()`. Called after:
- Mouse movement (hover updates)
- Click (selection updates)
- Camera change (layer visibility)
- Auto-rotation tick
- Marker visibility toggle

## Code Style

### ES5 JavaScript Throughout
- `var` instead of `let`/`const`
- `function()` instead of arrow functions
- `for` loops instead of `.map()` in performance-sensitive areas
- No destructuring, template literals, or modern syntax

### Inline Styles
All CSS is written as inline React style objects. No CSS modules, styled-components, or external stylesheets for components.

### Error Handling
- Try/catch around CesiumJS initialization with fallback terrain provider
- `dead` flag prevents state updates after unmount
- User-visible error state via `setErr()` displayed as banner

## Data Flow

```
countries.js → index.js (computed exports + SUB_CONFIGS + COUNTY_CONFIG)
                    ↓
              App.jsx (state hub)
              ├── CesiumGlobe.jsx (3D engine)
              │   ├── terrainSetup.js → Ion terrain + visual settings
              │   ├── populationLayer.js → GeoJSON entities (fetch + decode + color)
              │   │   └── topoUtils.js → decodeTopo() + pClr()
              │   ├── cityLayer.js → city markers/labels from cities.geojson
              │   ├── buildingsLayer.js → 3D OSM Buildings tileset
              │   ├── Country/subdivision/county point markers
              │   └── ScreenSpaceEventHandler → hover/click → App state
              ├── Sidebar.jsx (UI)
              │   ├── Search → filter entries
              │   ├── Hierarchical list → expand/collapse
              │   ├── Detail panel → stats display
              │   └── Click → App.onSelect → CesiumGlobe.camera.flyTo()
              └── Tooltip.jsx (hover overlay)

On state expand (US):
  App.jsx → COUNTY_FILE_MAP → dynamic import → loadedCounties state
  CesiumGlobe.jsx → create county marker entities → toggle visibility
```

## Update History
- 2026-02-06: Major rewrite - Three.js/WebGPU patterns replaced by CesiumJS architecture
