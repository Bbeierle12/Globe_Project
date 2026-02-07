---
created: 2026-02-05T21:55:26Z
last_updated: 2026-02-06T20:37:15Z
version: 1.5
author: Claude Code PM System
---

# Project Overview

## Summary

Population Globe is a React + Three.js web application that renders an interactive 3D globe showing population data for 174 countries/territories, 492+ subdivisions, and 1,040 US counties. Countries can be expanded to reveal their states/provinces with geographical boundaries painted on the globe texture, and US states can be further expanded to show county-level data. Subdivision handling uses a data-driven `SUB_CONFIGS` pattern for easy extensibility. WebGPU compute shaders are available for heavy boundary rendering and population calculations with CPU fallback.

## Current State

The application is functional with:
- Full 3D globe rendering with population-based coloring
- 174 countries/territories with markers, sidebar entries, and detail panels (full world-atlas coverage)
- 22 countries with complete subdivision data and geographical boundaries:
  - Russia (85 subjects), USA (51 states), Nigeria (37 states), India (36 states/UTs)
  - China (33 provinces), Indonesia (33 provinces), Colombia (33 departments)
  - Mexico (32 states), Brazil (27 states), Peru (26 regions)
  - Venezuela (25 states), Argentina (24 provinces), Ecuador (24 provinces)
  - Uruguay (19 departments), Paraguay (18 departments), Chile (16 regions)
  - Canada (13 provinces/territories), Guyana (10 regions), Suriname (10 districts)
  - Bolivia (9 departments), Bangladesh (8 divisions), Pakistan (7 provinces)
  - French Guiana (1 territory)
- Three-level hierarchy: Country > State > County (1,040 counties across 10 US states)
- Lazy-loaded county data via Vite dynamic imports
- WebGPU compute shaders for population heat mapping and arc transforms (with CPU fallback)
- Expand/collapse UI for viewing subdivisions and counties
- Search with auto-expansion
- Hover tooltips and selection detail panel

## Feature List

| Feature | Status |
|---------|--------|
| 3D globe rendering | Complete |
| Country markers & tooltips | Complete |
| Sidebar with search | Complete |
| Detail panel | Complete |
| Expand/collapse for subdivisions | Complete |
| USA subdivisions + boundaries | Complete |
| Canada subdivisions + boundaries | Complete |
| Mexico subdivisions + boundaries | Complete |
| India subdivisions + boundaries | Complete |
| China subdivisions + boundaries | Complete |
| Brazil subdivisions + boundaries | Complete |
| Colombia subdivisions + boundaries | Complete |
| Peru subdivisions + boundaries | Complete |
| Full globe country coverage (174) | Complete |
| South American expansion (10 countries) | Complete |
| Indonesia subdivisions + boundaries | Complete |
| Pakistan subdivisions + boundaries | Complete |
| Nigeria subdivisions + boundaries | Complete |
| Bangladesh subdivisions + boundaries | Complete |
| Russia subdivisions + boundaries | Complete |
| US county-level subdivisions (top 10 states) | Complete |
| WebGPU compute shaders | Complete |
| Remaining US states county data | Not started |
| Remaining 152 countries' subdivisions | Not started |
| Mobile/touch support | Not implemented |

## External Data Sources

| Source | URL | Purpose |
|--------|-----|---------|
| world-atlas | cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json | World country boundaries |
| us-atlas | cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json | US state boundaries |
| Brideau gist | gist.githubusercontent.com/Brideau/... | Canadian province boundaries |
| diegovalle gist | gist.githubusercontent.com/diegovalle/... | Mexican state boundaries |
| india-maps-data | cdn.jsdelivr.net/gh/udit-001/india-maps-data@ef25ebc/... | Indian state boundaries |
| cn-atlas | cdn.jsdelivr.net/npm/cn-atlas@0.1.2/cn-atlas.json | Chinese province boundaries |
| geoBoundaries | github.com/wmgeolab/geoBoundaries | Bangladesh divisions (CC-BY 4.0) |
| us-atlas counties | cdn.jsdelivr.net/npm/us-atlas@3/counties-10m.json | US county boundaries (lazy-loaded) |
| US Census Bureau | CO-EST2024 + 2024 Gazetteer | County population, coordinates, area |
| Local TopoJSON | /topo/*.json | Brazil, Colombia, Peru + 10 SA + ID, PK, NG, BD, RU |

## Integration Points

- **CDN-hosted TopoJSON** - 6 CDN fetches at startup (world + 5 country atlases)
- **CDN county topology** - 1 lazy fetch on first county expansion (~822KB, ~200KB gzipped)
- **Local TopoJSON** - Up to 18 local fetches for countries without CDN sources
- **Lazy-loaded county data** - Vite code-split modules loaded on demand per state
- **WebGPU compute** - Optional GPU acceleration for boundary rendering (CPU fallback)
- **No backend** - Fully client-side application
- **No API calls** - All population data is embedded in source code
- **Vite dev server** - Hot module replacement during development
