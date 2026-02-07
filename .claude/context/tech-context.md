---
created: 2026-02-05T21:55:26Z
last_updated: 2026-02-06T22:01:21Z
version: 2.0
author: Claude Code PM System
---

# Tech Context

## Core Stack

| Technology | Version | Purpose |
|-----------|---------|---------|
| React | 19.2.0 | UI framework |
| CesiumJS | 1.138.0 | 3D geospatial globe engine (terrain, imagery, 3D tiles, GeoJSON) |
| Vite | 7.2.4 | Build tool and dev server |
| Node.js | (project uses ES modules) | Runtime |

## Dependencies

### Production (`dependencies`)
- **react** `^19.2.0` - UI component framework
- **react-dom** `^19.2.0` - React DOM renderer
- **cesium** `^1.138.0` - 3D globe engine (Viewer, GeoJsonDataSource, CesiumTerrainProvider, Cesium3DTileset, etc.)

### Development (`devDependencies`)
- **@vitejs/plugin-react** `^5.1.1` - Vite React integration (Babel/Fast Refresh)
- **vite-plugin-static-copy** `^3.2.0` - Copies CesiumJS static assets (Workers, Assets, ThirdParty, Widgets)
- **eslint** `^9.39.1` - Linting
- **@eslint/js** `^9.39.1` - ESLint JavaScript config
- **eslint-plugin-react-hooks** `^7.0.1` - React hooks lint rules
- **eslint-plugin-react-refresh** `^0.4.24` - Fast Refresh lint rules
- **globals** `^16.5.0` - Global variable definitions for ESLint
- **@types/react** `^19.2.5` - TypeScript types (present but not actively used)
- **@types/react-dom** `^19.2.3` - TypeScript types (present but not actively used)

### Removed Dependencies
- **three** `^0.182.0` - Replaced by CesiumJS
- **d3** `^7.9.0` - No longer needed; custom `decodeTopo()` is standalone

## External Services

### Cesium Ion (Free Tier)
- **Token**: Stored in `.env` as `VITE_CESIUM_ION_TOKEN` (gitignored)
- **Cesium World Terrain** (Asset ID 1) - 3D terrain with water mask
- **Cesium OSM Buildings** (Asset ID 96188) - 3D building models, LOD streaming
- **Free tier limits**: 5 GB storage, 15 GB/mo streaming

### OpenStreetMap
- Base imagery tiles from `tile.openstreetmap.org` (no auth required)

## Development Tools

- **Vite** - Dev server with HMR (`npm run dev`)
- **ESLint** - Code linting (`npm run lint`)
- **Git** - Version control (single branch: `main`)
- **Python** - `compute_pop.py` script for data preparation (uses openpyxl for Excel processing)

## Build & Run

```bash
npm run dev      # Start dev server (Vite)
npm run build    # Production build
npm run preview  # Preview production build
npm run lint     # Run ESLint
```

**Vite Config**: `vite-plugin-static-copy` copies Cesium's Workers, Assets, ThirdParty, and Widgets directories. `CESIUM_BASE_URL` is defined as `"/cesium"`.

## Key Technical Patterns

### CesiumJS Integration with React
- CesiumJS `Viewer` created imperatively in `useEffect`, stored in `useRef`
- No Resium (incompatible with React 19)
- All Cesium UI widgets disabled; custom React sidebar/tooltip used instead
- `requestRenderMode: true` for performance (render only on changes)
- `scene.requestRender()` called explicitly when state changes

### TopoJSON Decoding
Custom `decodeTopo()` function in `src/cesium/topoUtils.js` (no topojson-client library) handles:
- Delta-decoded arc coordinates with transform (scale + translate)
- Polygon, MultiPolygon, and GeometryCollection geometry types
- Null geometry filtering (features with null type are excluded)
- Ring assembly from arc indices (including reversed arcs)

### GeoJSON Population Overlay
- TopoJSON decoded to GeoJSON, loaded via `Cesium.GeoJsonDataSource.load()`
- Per-entity coloring via `pClr()` population color function
- `clampToGround: true` for terrain conformance
- Outlines disabled (unsupported on terrain-clamped entities)
- Selection highlighting via material brightness change

### Data Fetching
- World TopoJSON + all `SUB_CONFIGS` URLs fetched in parallel via `Promise.all` (24 sources)
- CDN sources: world-atlas, us-atlas, Brideau (CA), diegovalle (MX), india-maps-data (IN), cn-atlas (CN)
- Local sources: `public/topo/*.json` for 18 countries
- City data: `public/data/cities.geojson` (Natural Earth Populated Places, pre-filtered)
- County data modules lazy-loaded via Vite dynamic `import()` per state
- All startup fetches happen inside a single `useEffect` with cleanup via `dead` flag

### Lazy Loading (County Data)
- `COUNTY_FILE_MAP` in `src/data/us-counties/index.js` maps state FIPS to dynamic imports
- Vite code-splits each state's county data into separate chunks (~2-7KB gzipped each)
- County markers created dynamically on state expansion in CesiumGlobe.jsx

### State Management
- State lifted to `App.jsx`: hover, selection, search, autoRotate, expanded, expandedStates, countyLoading, loadedCounties
- `CesiumGlobe.jsx` receives props and uses `useRef` for: viewer, handler, markers, layers, listeners
- `Sidebar.jsx` receives state + setters as props, uses `useMemo` for sorted list
- `useCallback` for toggle expand functions in App.jsx

## Platform

- **OS**: Windows (primary development)
- **Browser**: Any modern browser with WebGL support (CesiumJS uses WebGL)
- **No backend**: Fully client-side SPA
- **Environment**: `.env` file required for Cesium Ion token (gitignored)

## Update History
- 2026-02-06: Major update - Three.js/D3 replaced by CesiumJS, WebGPU compute removed
