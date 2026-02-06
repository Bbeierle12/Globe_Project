---
created: 2026-02-05T21:55:26Z
last_updated: 2026-02-05T21:55:26Z
version: 1.0
author: Claude Code PM System
---

# Tech Context

## Core Stack

| Technology | Version | Purpose |
|-----------|---------|---------|
| React | 19.2.0 | UI framework |
| Three.js | 0.182.0 | 3D WebGL rendering |
| D3.js | 7.9.0 | Geographic projection and path generation |
| Vite | 7.2.4 | Build tool and dev server |
| Node.js | (project uses ES modules) | Runtime |

## Dependencies

### Production (`dependencies`)
- **react** `^19.2.0` - UI component framework
- **react-dom** `^19.2.0` - React DOM renderer
- **three** `^0.182.0` - 3D rendering (WebGLRenderer, PerspectiveCamera, SphereGeometry, Raycaster, etc.)
- **d3** `^7.9.0` - Used specifically for `d3.geoEquirectangular()`, `d3.geoPath()`, and `d3.geoGraticule10()`

### Development (`devDependencies`)
- **@vitejs/plugin-react** `^5.1.1` - Vite React integration (Babel/Fast Refresh)
- **eslint** `^9.39.1` - Linting
- **@eslint/js** `^9.39.1` - ESLint JavaScript config
- **eslint-plugin-react-hooks** `^7.0.1` - React hooks lint rules
- **eslint-plugin-react-refresh** `^0.4.24` - Fast Refresh lint rules
- **globals** `^16.5.0` - Global variable definitions for ESLint
- **@types/react** `^19.2.5` - TypeScript types (present but not actively used)
- **@types/react-dom** `^19.2.3` - TypeScript types (present but not actively used)

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

## Key Technical Patterns

### TopoJSON Decoding
Custom `decodeTopo()` function (no topojson-client library) handles:
- Delta-decoded arc coordinates with transform (scale + translate)
- Polygon and MultiPolygon geometry types
- Ring assembly from arc indices (including reversed arcs)

### Canvas Texture Projection
- 4096x2048 canvas with `d3.geoEquirectangular().fitSize()` projection
- Features painted with population-based color gradient
- Borders drawn as strokes over filled regions
- Canvas converted to Three.js `CanvasTexture` applied to sphere

### Data Fetching
- 5 TopoJSON sources fetched in parallel via `Promise.all`
- All fetches happen inside a single `useEffect` with cleanup via `dead` flag
- Error handling shows user-visible error message

### State Management
- React `useState` for: hover, selection, search, loading, autoRotate, error, expanded
- `useRef` for: mount element, hover state, autoRotate flag, markers, visible markers
- `useMemo` for hierarchical sorted list (depends on search + expanded)
- `useCallback` for toggle expand function

## Platform

- **OS**: Windows (primary development)
- **Browser**: Any modern browser with WebGL support
- **No backend**: Fully client-side SPA
