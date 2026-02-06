---
created: 2026-02-05T21:55:26Z
last_updated: 2026-02-06T11:06:50Z
version: 1.1
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

### `src/Globe.jsx` (758 lines)
The single monolithic component containing all application logic:
- Three.js scene setup (camera, lights, renderer, controls)
- TopoJSON fetching and decoding (custom `decodeTopo()` function)
- Canvas texture painting with d3 projection
- Marker creation and visibility management
- React state and UI rendering (sidebar, tooltip, detail panel)
- Mouse/wheel event handlers for interaction

### `src/data/countries.js` (~315 lines)
Hierarchical data array with 174 countries/territories where each country contains:
- Basic info: name, population, coordinates, type, aliases, ISO code
- Subdivision label and embedded subdivisions array
- Subdivisions have demographic stats (density, region, capital, area, growth, age)

### `src/data/index.js` (31 lines)
Computed exports derived from countries data:
- `ISO_MAP` - ISO code → country object lookup
- `MP` - Maximum population (for scaling)
- `WORLD_POP` - Total world population
- `RC` - Region color map (US, Canadian, Mexican, Indian regions)
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
- Lookup maps (FIPS, CA_PROV, MX_STATE, IN_STATE) built at module scope in Globe.jsx
