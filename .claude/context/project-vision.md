---
created: 2026-02-05T21:55:26Z
last_updated: 2026-02-06T20:37:15Z
version: 1.4
author: Claude Code PM System
---

# Project Vision

## Long-term Goal

Create a comprehensive, visually compelling interactive population globe where every country can be expanded to reveal its internal administrative divisions with full demographic statistics and geographical boundaries.

## Strategic Phases

### Phase 1: Core Architecture + Initial Countries (Complete)
- Hierarchical data model with expand/collapse
- USA, Canada, Mexico, India with full subdivisions and boundaries
- 174 countries total (full world-atlas coverage)
- Data-driven SUB_CONFIGS pattern for extensible subdivision handling

### Phase 2: Major Countries Expansion (In Progress)
Add subdivisions and boundaries for high-population/priority countries:
- China (34 Provinces) - **Complete**
- Brazil (27 States) - **Complete**
- Colombia (33 Departments) - **Complete**
- Peru (26 Regions) - **Complete**
- Argentina (24 Provinces) - **Complete**
- Venezuela (25 States) - **Complete**
- Chile (16 Regions) - **Complete**
- Ecuador (24 Provinces) - **Complete**
- Bolivia (9 Departments) - **Complete**
- Paraguay (18 Departments) - **Complete**
- Uruguay (19 Departments) - **Complete**
- Guyana (10 Regions) - **Complete**
- Suriname (10 Districts) - **Complete**
- French Guiana (1 Territory) - **Complete**
- Germany (States) - Planned
- France (Regions) - Planned
- Australia (States/Territories) - Planned
- Japan (Prefectures) - Planned
- Indonesia (33 Provinces) - **Complete**
- Pakistan (7 Provinces) - **Complete**
- Nigeria (37 States) - **Complete**
- Bangladesh (8 Divisions) - **Complete**
- Russia (85 Federal Subjects) - **Complete**
- United Kingdom (Countries/Regions) - Planned
- South Korea (Provinces) - Planned

### Phase 2.5: County-Level Depth (In Progress)
Third hierarchy level for US states (Country > State > County):
- Top 10 states (1,040 counties) - **Complete** (CA, TX, FL, NY, PA, IL, OH, GA, NC, MI)
- Remaining 40 states + DC - Planned
- WebGPU compute shaders for boundary rendering - **Complete** (module created, integration pending)

### Phase 3: Global Coverage (Future)
Add remaining 152 countries' subdivisions progressively, prioritized by population.

### Phase 4: Enhanced Features (Future)
Potential expansions:
- Historical population data with time slider
- Additional demographic indicators (GDP, HDI, literacy)
- Comparison mode between regions
- Data export capabilities
- Mobile touch controls
- Performance optimization for full global subdivision coverage
- County-level depth for other countries (e.g., UK districts, France communes)

## Key Design Principles

1. **Data embedded in source** - No backend, no API dependencies, instant offline capability
2. **Progressive disclosure** - Countries show minimal info until expanded
3. **Visual consistency** - Same color scale, marker style, and UI patterns across all countries
4. **Graceful degradation** - Countries without subdivisions still function as first-class citizens
5. **TopoJSON per country** - Each country's boundaries sourced independently from CDN/GitHub
6. **Lazy loading** - County data loaded on demand via code-splitting, zero startup cost
7. **GPU acceleration** - WebGPU compute shaders for heavy computation with automatic CPU fallback

## Constraints

- **No backend** - All data must be embeddable in JavaScript source files
- **CDN TopoJSON** - Dependent on external hosts for boundary data availability
- **Single component** - Current architecture keeps all logic in one file for simplicity
- **ES5 style** - Codebase uses `var` and `function` throughout (deliberate choice)
