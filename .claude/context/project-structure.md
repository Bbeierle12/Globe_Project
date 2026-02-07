---
created: 2026-02-05T21:55:26Z
last_updated: 2026-02-06T19:14:57Z
version: 1.4
author: Claude Code PM System
---

# Project Structure

## Directory Layout

```
Globe_Project/
├── .git/                     # Git repository
├── .gitignore                # Git ignore rules
├── index.html                # Entry point HTML (single div#root)
├── package.json              # Node.js project config
├── package-lock.json         # Dependency lock file
├── vite.config.js            # Vite build config (React plugin)
├── eslint.config.js          # ESLint configuration
├── README.md                 # Default Vite+React readme
├── compute_pop.py            # Python script for population computation
├── census_pop.xlsx           # Census population data source
├── census_change.xlsx        # Census change data source
├── public/                   # Static assets (served as-is)
│   └── topo/                 # Local TopoJSON boundary files
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
│       ├── sr-districts.json # Suriname districts
│       ├── uy-departments.json # Uruguay departments
│       └── ve-states.json    # Venezuela states
├── dist/                     # Build output
├── node_modules/             # Dependencies
├── src/
│   ├── main.jsx              # React entry point (StrictMode + createRoot)
│   ├── App.jsx               # Root component (renders <Globe />)
│   ├── App.css               # Default Vite template styles (unused)
│   ├── index.css             # Global reset (box-sizing, full viewport)
│   ├── Globe.jsx             # Main component (~758 lines) - entire app UI
│   └── data/
│       ├── index.js          # Data exports hub (ISO_MAP, MP, WORLD_POP, RC, findCountry)
│       ├── countries.js      # All country + subdivision data (~239 lines)
│       └── idMap.js          # TopoJSON feature ID → country name mapping
└── .claude/
    └── context/              # Project context documentation
```

## Key Files

### `src/Globe.jsx` (~763 lines)
The single monolithic component containing all application logic:
- Three.js scene setup (camera, lights, renderer, controls)
- TopoJSON fetching and decoding (custom `decodeTopo()` function)
- Data-driven subdivision handling via `SUB_CONFIGS` iteration
- Canvas texture painting with d3 projection
- Marker creation and visibility management
- React state and UI rendering (sidebar, tooltip, detail panel)
- Mouse/wheel event handlers for interaction

### `src/data/countries.js` (~660 lines)
Hierarchical data array with 174 countries/territories where each country contains:
- Basic info: name, population, coordinates, type, aliases, ISO code
- Subdivision label and embedded subdivisions array
- 22 countries have populated subdivisions (492 total subdivisions)
- Subdivisions have demographic stats (density, region, capital, area, growth, age)

### `src/data/index.js` (~290 lines)
Data hub with computed exports and subdivision configuration:
- `ISO_MAP` - ISO code → country object lookup
- `MP` - Maximum population (for scaling)
- `WORLD_POP` - Total world population
- `RC` - Region color map (US, CA, MX, IN, CN, BR, CO, PE, AR, VE, CL, EC, BO, PY, UY, GY, SR, GF, ID, PK, NG, BD regions)
- `SUB_CONFIGS` - Array of 22 subdivision configuration objects (iso, url, objectName, codeField, extractCode)
- `findCountry()` - Feature ID → country object resolver

### `src/data/idMap.js` (4 lines)
Maps 174 TopoJSON numeric feature IDs to country names for matching world atlas features to country data. Covers all features in the countries-110m.json world atlas.

## File Naming Patterns

- React components: PascalCase `.jsx` (Globe.jsx, App.jsx)
- Data modules: camelCase `.js` (countries.js, idMap.js, index.js)
- Styles: PascalCase `.css` matching component (App.css)
- No TypeScript used despite `@types/react` in devDependencies

## Module Organization

- Single-component architecture: `Globe.jsx` contains virtually all logic
- Data extracted to `src/data/` directory with barrel export via `index.js`
- No separate utilities, hooks, or service files
- Subdivision configs (`SUB_CONFIGS`) defined in `index.js`, iterated generically in `Globe.jsx`
- Local TopoJSON files in `public/topo/` for countries without CDN sources
