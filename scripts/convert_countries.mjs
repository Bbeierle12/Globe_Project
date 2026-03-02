/**
 * Converts src/data/countries.js (compact JS format) to
 * rust/globe_desktop/assets/countries.json (Rust Country schema).
 *
 * Usage: node scripts/convert_countries.mjs
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));
const root  = join(__dir, '..');

// ── Read source ────────────────────────────────────────────────────────────────
const src = readFileSync(join(root, 'src/data/countries.js'), 'utf-8');

// Strip the ES module wrapper to get a plain array literal, then eval it.
const arrayLiteral = src
  .replace(/^var COUNTRIES\s*=\s*/, '')
  .replace(/;\s*export\s*\{[^}]*\}\s*;?\s*$/, '')
  .trim()
  .replace(/;$/, '');

const raw = eval('(' + arrayLiteral + ')');

// ── Conversion helpers ────────────────────────────────────────────────────────
function sub(s) {
  return {
    name:        s.n,
    population:  s.p,
    position:    { lat: s.la, lon: s.lo },
    density:     s.dn  ?? null,
    region:      s.rg  ?? null,
    capital:     s.cp  ?? null,
    area_km2:    s.ar  ?? null,
    change_pct:  s.ch  ?? null,
    median_age:  s.ag  ?? null,
    code:        s.sc  ?? null,
    parent_iso:  s.parentIso ?? '',
  };
}

function country(c) {
  return {
    name:               c.n,
    population:         c.p,
    position:           { lat: c.la, lon: c.lo },
    iso:                c.iso,
    aliases:            c.al || [],
    subdivision_label:  c.subdivisionLabel ?? null,
    subdivisions:       (c.subdivisions || []).map(sub),
  };
}

const converted = raw.filter(c => c.t === 'c').map(country);

// ── Write output ─────────────────────────────────────────────────────────────
const outDir  = join(root, 'rust/globe_desktop/assets');
const outFile = join(outDir, 'countries.json');

mkdirSync(outDir, { recursive: true });
writeFileSync(outFile, JSON.stringify(converted));

console.log(`Wrote ${converted.length} countries to ${outFile}`);
