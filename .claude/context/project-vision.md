---
created: 2026-02-05T21:55:26Z
last_updated: 2026-02-05T21:55:26Z
version: 1.0
author: Claude Code PM System
---

# Project Vision

## Long-term Goal

Create a comprehensive, visually compelling interactive population globe where every country can be expanded to reveal its internal administrative divisions with full demographic statistics and geographical boundaries.

## Strategic Phases

### Phase 1: Core Architecture + Initial Countries (Complete)
- Hierarchical data model with expand/collapse
- USA, Canada, Mexico, India with full subdivisions and boundaries
- 99 countries total, 132 subdivisions

### Phase 2: Major Countries Expansion (Planned)
Add subdivisions and boundaries for 10 high-population countries:
- China (Provinces)
- Brazil (States)
- Germany (States)
- France (Regions)
- Australia (States/Territories)
- Japan (Prefectures)
- Indonesia (Provinces)
- United Kingdom (Countries/Regions)
- South Korea (Provinces)
- Pakistan (Provinces)

### Phase 3: Global Coverage (Future)
Add remaining 85 countries' subdivisions progressively, prioritized by population.

### Phase 4: Enhanced Features (Future)
Potential expansions:
- Historical population data with time slider
- Additional demographic indicators (GDP, HDI, literacy)
- Comparison mode between regions
- Data export capabilities
- Mobile touch controls
- Performance optimization for full global subdivision coverage

## Key Design Principles

1. **Data embedded in source** - No backend, no API dependencies, instant offline capability
2. **Progressive disclosure** - Countries show minimal info until expanded
3. **Visual consistency** - Same color scale, marker style, and UI patterns across all countries
4. **Graceful degradation** - Countries without subdivisions still function as first-class citizens
5. **TopoJSON per country** - Each country's boundaries sourced independently from CDN/GitHub

## Constraints

- **No backend** - All data must be embeddable in JavaScript source files
- **CDN TopoJSON** - Dependent on external hosts for boundary data availability
- **Single component** - Current architecture keeps all logic in one file for simplicity
- **ES5 style** - Codebase uses `var` and `function` throughout (deliberate choice)
