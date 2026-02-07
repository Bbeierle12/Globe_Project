---
created: 2026-02-05T21:55:26Z
last_updated: 2026-02-06T14:46:15Z
version: 1.3
author: Claude Code PM System
---

# Progress

## Current Branch

`main` - Single branch, no feature branches

## Recent Commits

- `adf6794` Refactor code structure for improved readability and maintainability
- `576f1d3` feat: expand country region colors and add subdivisions for Canada, Mexico, and India
- `8510bce` feat: add country data and mapping, implement main application structure

## Outstanding Changes (Uncommitted)

- `src/data/index.js` - Modified: Added 10 South American SUB_CONFIGS (ARG, VEN, CHL, ECU, BOL, PRY, URY, GUY, SUR, GUF) and region colors
- `src/data/countries.js` - Modified: Added subdivision data for 10 South American countries (156 new subdivisions)
- 10 untracked TopoJSON files in `public/topo/` for South American countries (ar, bo, cl, ec, gf, gy, py, sr, uy, ve)

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
- Prepared SUB_CONFIGS for 10 additional South American countries (uncommitted)
- Created 10 TopoJSON files in `public/topo/` (untracked)
- Added region colors for: AR, VE, CL, EC, BO, PY, UY, GY, SR, GF
- Added subdivision data for all 10 countries (156 new subdivisions):
  - Argentina: 24 provinces, Venezuela: 25 states, Chile: 16 regions
  - Ecuador: 24 provinces, Bolivia: 9 departments, Paraguay: 18 departments
  - Uruguay: 19 departments, Guyana: 10 regions, Suriname: 10 districts
  - French Guiana: 1 territory
- Total: 18 countries with subdivisions, 407 total subdivisions

## Immediate Next Steps

1. **Commit South American expansion** (all data complete, uncommitted)
2. **Continue Phase 2:** Germany, France, Australia, Japan, Indonesia, UK, South Korea, Pakistan
3. **156 countries** still have empty subdivision arrays
