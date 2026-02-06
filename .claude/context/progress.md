---
created: 2026-02-05T21:55:26Z
last_updated: 2026-02-06T11:06:50Z
version: 1.1
author: Claude Code PM System
---

# Progress

## Current Branch

`main` - Single branch, no feature branches

## Recent Commits

- `576f1d3` feat: expand country region colors and add subdivisions for Canada, Mexico, and India
- `8510bce` feat: add country data and mapping, implement main application structure

## Outstanding Changes (Uncommitted)

- `src/data/countries.js` - Modified: 174 countries (was 99), 132 subdivisions (USA 51, India 36, Mexico 32, Canada 13)
- `src/data/idMap.js` - Modified: 174 feature ID mappings (was 97), Sudan code fix (736→729), added 77 new entries

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

### Canada Subdivisions
- Added 13 provinces/territories with full demographic stats
- Added Canadian region colors (Atlantic, Central, Prairies, West Coast, North)
- Fetches Brideau's TopoJSON for province boundaries
- Paints provinces individually, draws province borders

### Mexico Subdivisions
- Added 32 states with full demographic stats
- Added Mexican region colors (MX Central, MX Northwest, MX Northeast, MX West, MX South, MX Southeast)
- Fetches diegovalle's TopoJSON for state boundaries
- Paints states individually, draws state borders

### India Subdivisions
- Added 36 states and union territories with full demographic stats
- Added Indian region colors (IN North, IN South, IN East, IN West, IN Central, IN Northeast)
- Fetches india-maps-data TopoJSON for state boundaries
- Paints states individually, draws state borders

### Missing Countries (Round 1)
- Identified 18 countries in world TopoJSON with no data entries
- Added all 18: Bolivia, Botswana, Burkina Faso, Burundi, Chad, Cuba, Ivory Coast, Laos, Libya, Malawi, Namibia, Rwanda, Senegal, Somalia, South Sudan, Tunisia, Zambia, Zimbabwe

### Full Globe Coverage (Round 2)
- Identified 78 additional countries/territories in world-atlas TopoJSON with no ID_MAP entry (grayed out shapes)
- Fixed Sudan code mismatch: ID_MAP key `736` → `729` to match world-atlas
- Added Ecuador (`218`) to ID_MAP (was already in COUNTRIES but had no feature ID mapping)
- Added 75 new countries/territories to both ID_MAP and COUNTRIES:
  - 69 sovereign nations (Albania, Azerbaijan, Belarus, Benin, Bulgaria, etc.)
  - 6 territories (Puerto Rico, Greenland, French Guiana, New Caledonia, Western Sahara, Mayotte, Falkland Islands)
  - 1 special area (Antarctica with 0 population)
- Total coverage: 174 ID_MAP entries, 174 COUNTRIES entries, 132 subdivisions

## Immediate Next Steps

1. **Commit current changes** - Significant uncommitted work across 2 files (countries.js, idMap.js)
2. **Add subdivisions for more countries** - 170 countries still have empty subdivision arrays
3. **Priority countries for next phase:** China, Brazil, Germany, France, Australia, Japan, Indonesia, UK, South Korea, Pakistan (per original plan Phase 2)
4. **Find TopoJSON sources** for each new country's internal boundaries
