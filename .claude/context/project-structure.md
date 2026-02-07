---
created: 2026-02-05T21:55:26Z
last_updated: 2026-02-06T22:06:41Z
version: 2.0
author: Claude Code PM System
---

# Project Structure

## Directory Layout

```
Globe_Project/
├── .git/                     # Git repository
├── .gitignore                # Git ignore rules (includes .env)
├── .env                      # Cesium Ion token (gitignored)
├── index.html                # Entry point HTML (single div#root)
├── package.json              # Node.js project config
├── package-lock.json         # Dependency lock file
├── vite.config.js            # Vite build config (React plugin + Cesium static copy)
├── eslint.config.js          # ESLint configuration
├── README.md                 # Default Vite+React readme
├── compute_pop.py            # Python script for population computation
├── census_pop.xlsx           # Census population data source
├── census_change.xlsx        # Census change data source
├── public/                   # Static assets (served as-is)
│   ├── data/
│   │   └── cities.geojson    # Natural Earth Populated Places (~539KB, pre-filtered)
│   └── topo/                 # Local TopoJSON boundary files (18 countries)
│       ├── br-states.json    # Brazil states
│       ├── co-departments.json # Colombia departments
│       ├── pe-regions.json   # Peru regions
│       ├── ar-provinces.json # Argentina provinces
│       ├── bd-divisions.json # Bangladesh divisions (geoBoundaries source)
│       ├── bo-departments.json # Bolivia departments
│       ├── cl-regions.json   # Chile regions
│       ├── ec-provinces.json # Ecuador provinces
│       ├── gf-territory.json # French Guiana
│       ├── gy-regions.json   # Guyana regions
│       ├── id-provinces.json # Indonesia provinces
│       ├── ng-states.json    # Nigeria states
│       ├── pk-provinces.json # Pakistan provinces
│       ├── py-departments.json # Paraguay departments
│       ├── ru-regions.json   # Russia federal subjects (83 regions)
│       ├── sr-districts.json # Suriname districts
│       ├── uy-departments.json # Uruguay departments
│       └── ve-states.json    # Venezuela states
├── dist/                     # Build output
├── node_modules/             # Dependencies
├── src/
│   ├── main.jsx              # React entry point (StrictMode + createRoot)
│   ├── App.jsx               # Root component (state hub between CesiumGlobe + Sidebar)
│   ├── App.css               # Default Vite template styles (unused)
│   ├── index.css             # Global reset (box-sizing, full viewport)
│   ├── CesiumGlobe.jsx       # CesiumJS viewer component (~399 lines)
│   ├── components/
│   │   ├── Sidebar.jsx       # Search, hierarchical list, detail panel (~602 lines)
│   │   └── Tooltip.jsx       # Hover tooltip overlay (~65 lines)
│   ├── cesium/
│   │   ├── terrainSetup.js   # Ion token config + terrain provider (Asset ID 1)
│   │   ├── populationLayer.js # GeoJSON population overlay with TopoJSON decoding (~209 lines)
│   │   ├── cityLayer.js      # City markers/labels from Natural Earth data (~96 lines)
│   │   ├── buildingsLayer.js # 3D OSM Buildings via Ion Asset 96188 (~20 lines)
│   │   └── topoUtils.js      # Standalone TopoJSON decoder + population color function (~96 lines)
│   └── data/
│       ├── index.js          # Data exports hub (ISO_MAP, MP, WORLD_POP, RC, COUNTY_CONFIG, findCountry)
│       ├── countries.js      # All country + subdivision data (~660 lines)
│       ├── idMap.js          # TopoJSON feature ID → country name mapping
│       └── us-counties/      # Lazy-loaded US county data (Vite code-split)
│           ├── index.js      # Dynamic import registry (COUNTY_FILE_MAP)
│           ├── 06.js         # California (58 counties)
│           ├── 12.js         # Florida (67 counties)
│           ├── 13.js         # Georgia (159 counties)
│           ├── 17.js         # Illinois (102 counties)
│           ├── 26.js         # Michigan (83 counties)
│           ├── 36.js         # New York (62 counties)
│           ├── 37.js         # North Carolina (100 counties)
│           ├── 39.js         # Ohio (88 counties)
│           ├── 42.js         # Pennsylvania (67 counties)
│           └── 48.js         # Texas (254 counties)
└── .claude/
    └── context/              # Project context documentation
```

## Key Files

### `src/CesiumGlobe.jsx` (~399 lines)
CesiumJS viewer component managing the 3D globe lifecycle:
- CesiumJS `Viewer` creation in `useEffect` with cleanup on unmount
- OSM imagery via `OpenStreetMapImageryProvider` (set as `baseLayer` in constructor)
- Cesium World Terrain (Ion Asset 1) with water mask and vertex normals
- Population GeoJSON overlay layer (`populationLayer.js`)
- City markers/labels layer (`cityLayer.js`)
- 3D OSM Buildings layer (`buildingsLayer.js`, hidden until zoomed in)
- Country/subdivision/county point markers with LOD scaling (`NearFarScalar`)
- `ScreenSpaceEventHandler` for hover and click interactions
- Auto-rotation via `clock.onTick` listener
- Camera altitude-based layer visibility toggling
- `requestRenderMode: true` for performance (render only on changes)

### `src/App.jsx` (~120 lines)
Root component lifting shared state between CesiumGlobe, Sidebar, and Tooltip:
- State: hover, selection, search, autoRotate, expanded, expandedStates, countyLoading, loadedCounties
- County lazy-loading logic via `COUNTY_FILE_MAP` dynamic imports
- `useCallback` for toggle functions passed as props

### `src/components/Sidebar.jsx` (~602 lines)
Three-level hierarchical sidebar with search, list, and detail panel:
- Search input filtering by name, region, capital, alias
- Sorted flat list via `useMemo` (countries depth 0, subdivisions depth 1, counties depth 2)
- Expand/collapse chevrons for countries with subdivisions
- Expand arrows on US state rows for county-level data
- Detail panel with population stats, coordinates, density, area, growth rate
- Population bar charts relative to maximum

### `src/components/Tooltip.jsx` (~65 lines)
Hover tooltip overlay showing name, type badge, population, region, and capital.

### `src/cesium/` (5 files)
Modular CesiumJS setup:
- **terrainSetup.js** - Ion token configuration, terrain provider creation (Asset ID 1), globe visual settings
- **populationLayer.js** - Fetches world + subdivision TopoJSON, decodes via `topoUtils.js`, creates `GeoJsonDataSource` entities with population coloring, terrain-clamped, outlines disabled
- **cityLayer.js** - Loads `cities.geojson`, creates point + label entities with distance-based LOD visibility
- **buildingsLayer.js** - Loads Cesium OSM Buildings (Ion Asset 96188) as `Cesium3DTileset`
- **topoUtils.js** - Standalone `decodeTopo()` function (handles Polygon, MultiPolygon, GeometryCollection, null geometry filtering) + `pClr()` population color function

### `src/data/` (unchanged from pre-migration)
- **countries.js** (~660 lines) - Hierarchical data array with 174 countries/territories, 575+ subdivisions
- **index.js** (~325 lines) - Computed exports: ISO_MAP, MP, WORLD_POP, RC, SUB_CONFIGS (23 entries), COUNTY_CONFIG, findCountry()
- **idMap.js** (4 lines) - TopoJSON feature ID → country name mapping
- **us-counties/** (11 files) - Lazy-loaded county data for 10 US states, 1,040 total counties

## File Naming Patterns

- React components: PascalCase `.jsx` (CesiumGlobe.jsx, App.jsx, Sidebar.jsx, Tooltip.jsx)
- CesiumJS modules: camelCase `.js` (terrainSetup.js, populationLayer.js, cityLayer.js, buildingsLayer.js, topoUtils.js)
- Data modules: camelCase `.js` (countries.js, idMap.js, index.js)
- No TypeScript used despite `@types/react` in devDependencies

## Module Organization

- **Multi-component architecture**: App.jsx (state hub) + CesiumGlobe.jsx (3D engine) + Sidebar.jsx (UI) + Tooltip.jsx (overlay)
- **CesiumJS modules** in `src/cesium/`: terrain, population, cities, buildings, topo utilities
- **Data layer** in `src/data/`: unchanged from Three.js era, fully reusable
- **County data** lazy-loaded from `src/data/us-counties/` via Vite dynamic imports
- **Subdivision configs** (`SUB_CONFIGS`) defined in `index.js`, consumed by `populationLayer.js`
- **Local TopoJSON** files in `public/topo/` for 18 countries without CDN sources

## Update History
- 2026-02-06: Major restructure - Three.js monolith replaced by CesiumJS multi-file architecture
