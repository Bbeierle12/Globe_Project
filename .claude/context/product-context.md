---
created: 2026-02-05T21:55:26Z
last_updated: 2026-02-06T22:06:41Z
version: 2.0
author: Claude Code PM System
---

# Product Context

## Core Features

### 3D Interactive Globe (CesiumJS)
- CesiumJS-rendered 3D globe with real terrain (Cesium World Terrain, Ion Asset 1)
- OpenStreetMap base imagery tiles
- Terrain with vertex normals, water mask, and ocean wave animation
- Atmosphere glow effect and dynamic sun lighting
- Population-based color gradient for countries and subdivisions (blue > green > yellow > red)
- GeoJSON polygon entities clamped to terrain for country/subdivision borders
- Mouse drag rotation, scroll zoom, auto-rotation toggle
- 3D OSM Buildings (Ion Asset 96188) visible when zoomed into cities
- City markers and labels with distance-based LOD visibility
- `requestRenderMode` for performance (render only on changes)

### Country/Subdivision/County Markers
- White circular markers on globe surface for countries (always visible)
- Light blue circular markers for subdivisions (visible only when parent country is expanded)
- Lighter blue (`#b5ddff`) smaller markers for US counties (visible only when parent state is expanded)
- All markers use `NearFarScalar` for distance-based size scaling
- Marker size scaled by population relative to max
- Hover tooltip with name, type badge, population, region, and capital
- Click to select and view detailed statistics
- Camera fly-to on selection (country: 3000km, subdivision: 800km, county: 200km altitude)

### City Layer
- Natural Earth Populated Places data (~539KB pre-filtered GeoJSON)
- Point markers and text labels with distance-based visibility conditions
- Labels appear/disappear based on zoom level and city population
- Scale by distance for natural LOD behavior

### Sidebar List
- Three-level hierarchical list sorted by population: Country (depth 0) > State (depth 1) > County (depth 2)
- Expand/collapse chevron for countries with subdivisions
- Expand arrow on US state rows to reveal county-level data (lazy-loaded)
- Loading spinner while county data fetches
- Search by name, region, capital, or alias
- Search auto-expands matching parent countries
- Rank numbering (separate for countries, subdivisions, and counties)
- Population bar chart relative to maximum
- Region color indicators
- CTY badge for county entries with smaller font and deeper indentation

### Detail Panel
- Country view: name, COUNTRY badge, population, world percentage, coordinates, subdivision count
- Subdivision view: name, type badge (STATE/PROVINCE/etc.), tier label, population, parent/world percentages
- County view: name, CTY badge, population, parent state percentage, FIPS code, density, area, growth rate
- Conditional fields: region, capital/seat, density, area, median age, 2020-25 growth

### Geographical Boundaries (GeoJSON Population Overlay)
Countries with subdivision data have internal borders as terrain-clamped GeoJSON entities:
- USA: 51 states via us-atlas TopoJSON (CDN)
- India: 36 states/union territories via india-maps-data TopoJSON (CDN)
- China: 34 provinces via cn-atlas TopoJSON (CDN)
- Colombia: 33 departments via local TopoJSON
- Mexico: 32 states via diegovalle gist TopoJSON (CDN)
- Brazil: 27 states via local TopoJSON
- Peru: 26 regions via local TopoJSON
- Venezuela: 25 states via local TopoJSON
- Argentina: 24 provinces via local TopoJSON
- Ecuador: 24 provinces via local TopoJSON
- Uruguay: 19 departments via local TopoJSON
- Paraguay: 18 departments via local TopoJSON
- Chile: 16 regions via local TopoJSON
- Canada: 13 provinces/territories via Brideau gist TopoJSON (CDN)
- Guyana: 10 regions via local TopoJSON
- Suriname: 10 districts via local TopoJSON
- Bolivia: 9 departments via local TopoJSON
- Nigeria: 37 states via local TopoJSON
- Indonesia: 33 provinces via local TopoJSON
- Bangladesh: 8 divisions via geoBoundaries TopoJSON (local)
- Pakistan: 7 provinces via local TopoJSON
- Russia: 83 federal subjects via local TopoJSON
- French Guiana: 1 territory via local TopoJSON

### 3D OSM Buildings
- Cesium OSM Buildings (Ion Asset 96188) loaded as `Cesium3DTileset`
- Automatic LOD streaming (buildings only load when zoomed in close)
- Visible when camera altitude < 1,800,000m
- Zero performance impact at globe scale

## Data Coverage

- **174 countries/territories** with population, coordinates, and aliases (full world-atlas TopoJSON coverage)
- **575+ subdivisions** across 23 countries (USA: 51, Russia: 83, Nigeria: 37, India: 36, China: 34, Indonesia: 33, Colombia: 33, Mexico: 32, Brazil: 27, Peru: 26, Venezuela: 25, Argentina: 24, Ecuador: 24, Uruguay: 19, Paraguay: 18, Chile: 16, Canada: 13, Guyana: 10, Suriname: 10, Bolivia: 9, Bangladesh: 8, Pakistan: 7, French Guiana: 1)
- **1,040 US counties** across 10 states (lazy-loaded, third hierarchy level)
- **City data** from Natural Earth Populated Places (worldwide, pre-filtered)
- Subdivision stats include: population, density, region, capital, area, growth rate, median age
- County stats include: population, density, region, area, growth rate, FIPS code
- 151 countries have empty subdivision arrays (future expansion)
- Includes 6 territories (Puerto Rico, Greenland, French Guiana, New Caledonia, Western Sahara, Mayotte, Falkland Islands) and Antarctica

## User Interactions

1. **Rotate** - Click and drag to rotate the globe
2. **Zoom** - Scroll wheel to zoom in/out (reveals city labels, buildings at close range)
3. **Hover** - Mouse over markers to see tooltip
4. **Click marker** - Select country/subdivision to view details + camera fly-to
5. **Expand country** - Click chevron to reveal subdivisions in list and on globe
6. **Expand state** - Click expand arrow on US state rows to reveal counties (lazy-loaded)
7. **Search** - Type to filter countries, subdivisions, and loaded counties
8. **Toggle rotation** - Click Rotating/Paused button

## Update History
- 2026-02-06: Major update - CesiumJS features (real terrain, cities, buildings, GeoJSON overlay)
