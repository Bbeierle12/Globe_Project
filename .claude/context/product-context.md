---
created: 2026-02-05T21:55:26Z
last_updated: 2026-02-05T21:55:26Z
version: 1.0
author: Claude Code PM System
---

# Product Context

## Core Features

### 3D Interactive Globe
- WebGL-rendered sphere with equirectangular texture projection
- Population-based color gradient for countries and subdivisions (blue → green → yellow → red)
- Country borders and subdivision borders drawn on the texture
- Atmosphere glow effect and star field background
- Mouse drag rotation, scroll zoom, auto-rotation toggle
- Graticule grid overlay

### Country/Subdivision Markers
- White circular markers on globe surface for countries (always visible)
- Light blue circular markers for subdivisions (visible only when parent country is expanded)
- Marker size scaled by population relative to max
- Hover tooltip with name, type badge, population, region, and capital
- Click to select and view detailed statistics

### Sidebar List
- Hierarchical country list sorted by population
- Expand/collapse chevron for countries with subdivisions
- Search by name, region, capital, or alias
- Search auto-expands matching parent countries
- Rank numbering (separate for countries and subdivisions)
- Population bar chart relative to maximum
- Region color indicators

### Detail Panel
- Country view: name, COUNTRY badge, population, world percentage, coordinates, subdivision count
- Subdivision view: name, type badge (STATE/PROVINCE/etc.), tier label, population, parent/world percentages
- Conditional fields: region, capital, density, area, median age, 2020-25 growth
- Growth rate bar and density comparison bar

### Geographical Boundaries
Countries with subdivision data have internal borders painted on the globe texture:
- USA: 51 states via us-atlas TopoJSON
- Canada: 13 provinces/territories via Brideau gist TopoJSON
- Mexico: 32 states via diegovalle gist TopoJSON
- India: 36 states/union territories via india-maps-data TopoJSON

## Data Coverage

- **99 countries** with population, coordinates, and aliases
- **132 subdivisions** across 4 countries (USA: 51, India: 36, Mexico: 32, Canada: 13)
- Subdivision stats include: population, density, region, capital, area, growth rate, median age
- 95 countries have empty subdivision arrays (future expansion)

## User Interactions

1. **Rotate** - Click and drag to rotate the globe
2. **Zoom** - Scroll wheel to zoom in/out
3. **Hover** - Mouse over markers to see tooltip
4. **Click marker** - Select country/subdivision to view details
5. **Expand country** - Click chevron to reveal subdivisions in list and on globe
6. **Search** - Type to filter countries and subdivisions
7. **Toggle rotation** - Click Rotating/Paused button
