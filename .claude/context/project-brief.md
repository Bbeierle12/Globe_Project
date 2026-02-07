---
created: 2026-02-05T21:55:26Z
last_updated: 2026-02-06T20:37:15Z
version: 1.3
author: Claude Code PM System
---

# Project Brief

## What It Does

Population Globe is an interactive 3D globe visualization that displays population data for countries, their subdivisions (states, provinces, regions), and US counties. Users can explore the world by rotating/zooming a WebGL-rendered globe, clicking markers to view detailed demographic statistics, expanding countries to reveal their internal administrative divisions with geographical boundaries, and drilling down into US states to see county-level data. WebGPU compute shaders accelerate heavy boundary rendering when available.

## Why It Exists

To provide an intuitive, visually rich way to explore and compare population statistics across countries and their subdivisions. Rather than reading tables of data, users interact with a spatial representation that makes geographic context immediately apparent -- seeing how population concentrates in certain regions, comparing subdivision sizes within countries, and understanding relative scale.

## Success Criteria

1. Globe renders smoothly with all 174 countries displayed as interactive markers
2. Countries with subdivisions (22 countries currently) expand to show sub-national markers and list items
3. US states expand to show county-level markers and list items (1,040 counties across 10 states)
4. TopoJSON boundaries render correctly for all countries with subdivision data
5. Population statistics, growth rates, density, and other metrics display accurately
6. Search filters countries, subdivisions, and loaded counties with auto-expansion
7. All data loads within a few seconds on typical connections
8. WebGPU compute accelerates boundary rendering when available, with seamless CPU fallback

## Target Users

- Data enthusiasts exploring demographic patterns
- Students and educators studying world population
- Anyone curious about comparative population statistics across regions

## Scope

- **In scope:** Country-level, subdivision-level, and county-level population data, interactive 3D globe, sidebar list with search, detail panel with demographics, WebGPU compute acceleration
- **Out of scope:** Real-time data updates, user accounts, data editing, mobile-optimized touch controls
