---
created: 2026-02-05T21:55:26Z
last_updated: 2026-02-06T11:06:50Z
version: 1.1
author: Claude Code PM System
---

# Project Overview

## Summary

Population Globe is a React + Three.js web application that renders an interactive 3D globe showing population data for 174 countries/territories and 132 subdivisions. Countries can be expanded to reveal their states/provinces with geographical boundaries painted on the globe texture.

## Current State

The application is functional with:
- Full 3D globe rendering with population-based coloring
- 174 countries/territories with markers, sidebar entries, and detail panels (full world-atlas coverage)
- 4 countries with complete subdivision data and geographical boundaries:
  - USA (51 states)
  - India (36 states/UTs)
  - Mexico (32 states)
  - Canada (13 provinces/territories)
- Expand/collapse UI for viewing subdivisions
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
| Full globe country coverage (174) | Complete |
| Remaining 170 countries' subdivisions | Not started |
| Mobile/touch support | Not implemented |

## External Data Sources

| Source | URL | Purpose |
|--------|-----|---------|
| world-atlas | cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json | World country boundaries |
| us-atlas | cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json | US state boundaries |
| Brideau gist | gist.githubusercontent.com/Brideau/... | Canadian province boundaries |
| diegovalle gist | gist.githubusercontent.com/diegovalle/... | Mexican state boundaries |
| india-maps-data | cdn.jsdelivr.net/gh/udit-001/india-maps-data@ef25ebc/... | Indian state boundaries |

## Integration Points

- **CDN-hosted TopoJSON** - 5 separate fetches at startup via `Promise.all`
- **No backend** - Fully client-side application
- **No API calls** - All population data is embedded in source code
- **Vite dev server** - Hot module replacement during development
