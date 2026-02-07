---
created: 2026-02-05T21:55:26Z
last_updated: 2026-02-06T19:14:57Z
version: 1.4
author: Claude Code PM System
---

# Progress

## Current Branch

`main` - Single branch, no feature branches

## Recent Commits

- `6da81d0` Add GeoJSON topology for Pakistan provinces
- `a6395a6` Refactor code structure for improved readability and maintainability
- `adf6794` Refactor code structure for improved readability and maintainability
- `576f1d3` feat: expand country region colors and add subdivisions for Canada, Mexico, and India
- `8510bce` feat: add country data and mapping, implement main application structure

## Outstanding Changes (Uncommitted)

- `src/data/index.js` - Modified: Added BGD SUB_CONFIGS entry and BD region colors (BD Central, BD West, BD East, BD South)
- `src/data/countries.js` - Modified: Added 8 Bangladesh division subdivisions
- `public/topo/bd-divisions.json` - New: Bangladesh divisions TopoJSON (8 divisions from geoBoundaries, 9 KB)
- `public/topo/ng-states.json` - New: Nigeria states TopoJSON

## Completed Work

### Phase 1: Architecture + USA
- Extracted data from Globe.jsx into `src/data/` directory (idMap.js, countries.js, index.js)
- Restructured data model to hierarchical Country → Subdivision
- Added USA as a country entry with 51 state subdivisions
- Implemented expand/collapse state and toggle UI
- Built hierarchical sorted memo with search auto-expansion
- Created subdivision marker visibility toggling
- Updated raycaster to use visible markers ref
- Updated sidebar, tooltip, and detail panel for hierarchical display

### Canada, Mexico, India Subdivisions
- Canada: 13 provinces/territories with Brideau TopoJSON
- Mexico: 32 states with diegovalle TopoJSON
- India: 36 states/UTs with india-maps-data TopoJSON
- Region color systems for each country

### Full Globe Coverage
- 174 countries/territories with ID_MAP entries (full world-atlas coverage)
- Fixed Sudan code mismatch (736→729)
- Added 75+ new countries/territories to both ID_MAP and COUNTRIES

### Major Refactor: Data-Driven SUB_CONFIGS (adf6794)
- Replaced per-country hardcoded lookup maps (FIPS, CA_PROV, MX_STATE, IN_STATE) with generic `SUB_CONFIGS` array
- Each config specifies: iso, url, objectName, codeField, extractCode function
- Globe.jsx now iterates SUB_CONFIGS for fetching, painting, and border drawing
- Added China subdivisions (34 provinces via cn-atlas)
- Added Brazil subdivisions (27 states via local topo)
- Added Colombia subdivisions (33 departments via local topo)
- Added Peru subdivisions (26 regions via local topo)
- Local TopoJSON files stored in `public/topo/` (3 committed: br, co, pe)
- Total: 8 countries with subdivisions, 251 total subdivisions

### South American Expansion (Complete)
- Added SUB_CONFIGS for 10 additional South American countries
- Created 10 TopoJSON files in `public/topo/`
- Added region colors for: AR, VE, CL, EC, BO, PY, UY, GY, SR, GF
- Added subdivision data for all 10 countries (156 new subdivisions)

### Asian & African Expansion (In Progress)
- Indonesia: 33 provinces via local TopoJSON
- Pakistan: 7 provinces/territories via local TopoJSON (committed in `6da81d0`)
- Nigeria: 37 states via local TopoJSON (uncommitted)
- Bangladesh: 8 divisions via geoBoundaries TopoJSON (uncommitted)
  - Used geoBoundaries instead of Natural Earth (NE missing Mymensingh/BD-H)
  - `shapeISO` renamed to `iso_3166_2` for standard extractCode compatibility
  - 4 region colors: BD Central, BD West, BD East, BD South
- Total: 22 countries with subdivisions, 492 total subdivisions

## Immediate Next Steps

1. **Commit current changes** (Bangladesh + Nigeria data, uncommitted)
2. **Continue Phase 2:** Germany, France, Australia, Japan, UK, South Korea
3. **152 countries** still have empty subdivision arrays
