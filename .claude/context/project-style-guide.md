---
created: 2026-02-05T21:55:26Z
last_updated: 2026-02-06T13:59:27Z
version: 1.1
author: Claude Code PM System
---

# Project Style Guide

## JavaScript Style

### ES5 Syntax Required
The entire codebase uses ES5-style JavaScript deliberately. Follow these conventions:

```js
// Variables - always use var
var count = 0;
var items = [];

// Functions - always use function expressions/declarations
function doSomething(x) { return x * 2; }
var handler = function(e) { e.preventDefault(); };

// Iteration - use forEach or for loops
items.forEach(function(item) { /* ... */ });
for (var i = 0; i < items.length; i++) { /* ... */ }

// Object spread alternative
var n = {}; for (var k in prev) n[k] = prev[k]; n[key] = value;
```

### Avoid
- `let` / `const`
- Arrow functions (`=>`)
- Template literals (`` ` ` ``)
- Destructuring (`var { a, b } = obj`)
- Spread operator (`...`)
- `class` syntax
- `async`/`await`

## Naming Conventions

### Data Properties (Short Names)
Population data uses abbreviated property names for compact file size:

| Short | Meaning | Example |
|-------|---------|---------|
| `n` | name | "California" |
| `p` | population | 39355309 |
| `la` | latitude | 36.78 |
| `lo` | longitude | -119.42 |
| `t` | type | "c" (country) or "s" (subdivision) |
| `al` | aliases | ["USA", "US"] |
| `iso` | ISO code | "USA" |
| `dn` | density (per mi²) | 252.6 |
| `rg` | region | "West" |
| `cp` | capital | "Sacramento" |
| `ar` | area (mi²) | 163696 |
| `ch` | change % (2020-25) | -0.5 |
| `ag` | median age | 38.4 |
| `fp` | FIPS code (US only) | "06" |
| `pc` | province code (Canada) | "CA-ON" |
| `sc` | state code (Mexico/India) | "15" |

### Function Names (Short)
Internal utility functions use terse names:
- `fmt()` - Format number (K/M/B)
- `pClr()` - Population color
- `ll2v()` - Lat/lon to Vector3
- `tier()` - Population tier label

### Variables (Short)
- `R` - Globe radius
- `gg` - Globe group (Three.js)
- `rc` - Raycaster
- `rv` - Rotation velocity
- `af` - Animation frame ID
- `mk` - Marker mesh
- `dm` - Data map

### React Refs
- `mountRef` - DOM mount element
- `hovRef` - Current hover state
- `arRef` - Auto-rotate flag
- `mkRef` - Markers registry
- `visibleMkRef` - Visible markers for raycaster

## CSS Style

### Inline Styles Only
All styles are written as React inline style objects directly on elements. No external CSS classes are used for the Globe component.

```jsx
<div style={{ padding: "4px 7px", margin: "1px 0", borderRadius: 4 }}>
```

### Color Palette
- Background: `#050810` (deep navy)
- Panel background: `rgba(6,10,20,0.94)`
- Text primary: `#dce6f2`
- Text secondary: `#b8c8dd`
- Text muted: `#4a6a88`
- Text dim: `#354a60`
- Accent blue: `#4d9ae8`
- Active blue: `#3a80e0`
- Border: `rgba(50,100,180,0.08)` to `rgba(50,100,180,0.12)`
- Success: `#27ae60`
- Error/decline: `#e74c3c`

### Font
- System font stack: `'Segoe UI', system-ui, sans-serif`
- Sizes: 7-20px range
- Weights: 300 (light/numbers), 600 (labels), 700 (headings/ranks)

## Region Color System

Region names are prefixed by country to avoid collisions:
- US regions: `South`, `West`, `Midwest`, `Northeast` (no prefix)
- Canadian regions: `Atlantic`, `Central`, `Prairies`, `West Coast`, `North` (no prefix)
- Mexican regions: `MX Central`, `MX Northwest`, `MX Northeast`, `MX West`, `MX South`, `MX Southeast`
- Indian regions: `IN North`, `IN South`, `IN East`, `IN West`, `IN Central`, `IN Northeast`

## File Organization

- One monolithic component (`Globe.jsx`) for all UI logic
- Data separated into `src/data/` with barrel export via `index.js`
- Lookup maps built at module scope (outside component)
- Computed values (ISO_MAP, MP, WORLD_POP) in data index file

## Adding New Countries with Subdivisions

Pattern for adding a new country's subdivisions (data-driven via SUB_CONFIGS):

1. **In `countries.js`**: Add subdivision entries to the country's `subdivisions` array with all stats
2. **In `index.js`**:
   - Add region colors to `RC` with country-prefix (e.g., `"BR Southeast": "#e74c3c"`)
   - Add a `SUB_CONFIGS` entry with: `iso`, `url`, `objectName`, `codeField`, `extractCode`, `skipName`
3. **If using local TopoJSON**: Place the `.json` file in `public/topo/` and use relative URL `/topo/{file}.json`
4. **No changes needed in `Globe.jsx`** - it iterates SUB_CONFIGS generically

### SUB_CONFIGS Entry Template
```js
{
  iso: "XXX",
  url: "/topo/xx-subdivisions.json",
  objectName: "ne_10m_admin_1_states_provinces",
  codeField: "sc",
  extractCode: function(f) {
    var code = f.properties && f.properties.iso_3166_2;
    if (!code) return null;
    var parts = code.split("-");
    return parts.length > 1 ? parts[1] : code;
  },
  skipName: "Country Name"
}
```
