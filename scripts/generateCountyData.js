#!/usr/bin/env node
/**
 * generateCountyData.js
 *
 * Downloads US county population data from Census Bureau API,
 * computes centroids from us-atlas TopoJSON, and generates
 * per-state JS files in src/data/us-counties/.
 *
 * Data sources:
 * - Census 2020 DHC for baseline population (P1_001N)
 * - Census 2022 ACS 5-year for updated population (B01003_001E)
 * - us-atlas counties-10m.json for centroids and approximate area
 *
 * Usage: node scripts/generateCountyData.js
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { feature } from "topojson-client";

var __dirname = dirname(fileURLToPath(import.meta.url));
var COUNTY_DIR = join(__dirname, "..", "src", "data", "us-counties");
mkdirSync(COUNTY_DIR, { recursive: true });

// State FIPS to Census region mapping
var FIPS_TO_REGION = {
  "01": "South", "02": "West", "04": "West", "05": "South", "06": "West",
  "08": "West", "09": "Northeast", "10": "South", "11": "South", "12": "South",
  "13": "South", "15": "West", "16": "West", "17": "Midwest", "18": "Midwest",
  "19": "Midwest", "20": "Midwest", "21": "South", "22": "South", "23": "Northeast",
  "24": "South", "25": "Northeast", "26": "Midwest", "27": "Midwest", "28": "South",
  "29": "Midwest", "30": "West", "31": "Midwest", "32": "West", "33": "Northeast",
  "34": "Northeast", "35": "West", "36": "Northeast", "37": "South", "38": "Midwest",
  "39": "Midwest", "40": "South", "41": "West", "42": "Northeast", "44": "Northeast",
  "45": "South", "46": "Midwest", "47": "South", "48": "South", "49": "West",
  "50": "Northeast", "51": "South", "53": "West", "54": "South", "55": "Midwest",
  "56": "West"
};

// FIPS codes to skip (already have data files)
var EXISTING = new Set(["06", "12", "13", "17", "26", "36", "37", "39", "42", "48"]);

// All FIPS to generate (41 new states + DC)
var TARGET_FIPS = [
  "01","02","04","05","08","09","10","11","15","16","18","19","20","21",
  "22","23","24","25","27","28","29","30","31","32","33","34","35","38",
  "40","41","44","45","46","47","49","50","51","53","54","55","56"
];

async function fetchJSON(url) {
  console.log("  Fetching " + url.substring(0, 90) + " ...");
  var res = await fetch(url);
  if (!res.ok) throw new Error("HTTP " + res.status + " for " + url);
  return res.json();
}

/**
 * Compute centroid of a GeoJSON geometry.
 */
function centroid(geometry) {
  var coords = [];
  function collect(c, type) {
    if (type === "Point") { coords.push(c); }
    else if (type === "MultiPoint" || type === "LineString") { c.forEach(function(p) { coords.push(p); }); }
    else if (type === "MultiLineString" || type === "Polygon") { c.forEach(function(ring) { ring.forEach(function(p) { coords.push(p); }); }); }
    else if (type === "MultiPolygon") { c.forEach(function(poly) { poly.forEach(function(ring) { ring.forEach(function(p) { coords.push(p); }); }); }); }
  }
  if (geometry.type === "GeometryCollection") {
    geometry.geometries.forEach(function(g) { collect(g.coordinates, g.type); });
  } else {
    collect(geometry.coordinates, geometry.type);
  }
  if (coords.length === 0) return { lat: 0, lon: 0 };
  var sumLat = 0, sumLon = 0;
  coords.forEach(function(c) { sumLon += c[0]; sumLat += c[1]; });
  return { lat: sumLat / coords.length, lon: sumLon / coords.length };
}

/**
 * Approximate area of a GeoJSON polygon in sq miles using the Spherical excess formula.
 */
function approxAreaSqMi(geometry) {
  var R = 3958.8; // Earth radius in miles
  var toRad = Math.PI / 180;

  function ringArea(ring) {
    var area = 0;
    for (var i = 0; i < ring.length - 1; i++) {
      var p1 = ring[i], p2 = ring[i + 1];
      area += (p2[0] - p1[0]) * toRad * (2 + Math.sin(p1[1] * toRad) + Math.sin(p2[1] * toRad));
    }
    return Math.abs(area * R * R / 2);
  }

  var total = 0;
  if (geometry.type === "Polygon") {
    total = ringArea(geometry.coordinates[0]);
  } else if (geometry.type === "MultiPolygon") {
    geometry.coordinates.forEach(function(poly) { total += ringArea(poly[0]); });
  }
  return total;
}

async function main() {
  console.log("Downloading data sources...\n");

  // 1. Census 2020 Decennial (baseline population)
  var census2020 = await fetchJSON(
    "https://api.census.gov/data/2020/dec/dhc?get=NAME,P1_001N&for=county:*"
  );

  // 2. Census 2022 ACS 5-year (more recent population)
  var acs2022 = await fetchJSON(
    "https://api.census.gov/data/2022/acs/acs5?get=NAME,B01003_001E&for=county:*"
  );

  // 3. us-atlas TopoJSON for county geometries (centroids + area)
  var topoData = await fetchJSON(
    "https://cdn.jsdelivr.net/npm/us-atlas@3/counties-10m.json"
  );

  // Parse Census 2020
  var pop2020Map = new Map();
  for (var i = 1; i < census2020.length; i++) {
    var row = census2020[i];
    var fips = row[2] + row[3]; // state + county
    if (row[3] === "000") continue;
    pop2020Map.set(fips, { name: row[0], pop: parseInt(row[1]) });
  }

  // Parse ACS 2022
  var pop2022Map = new Map();
  for (i = 1; i < acs2022.length; i++) {
    row = acs2022[i];
    fips = row[2] + row[3];
    if (row[3] === "000") continue;
    pop2022Map.set(fips, { name: row[0], pop: parseInt(row[1]) });
  }

  // Parse TopoJSON into GeoJSON features for centroids + area
  var geoFeatures = feature(topoData, topoData.objects.counties).features;
  var geoMap = new Map();
  geoFeatures.forEach(function(f) {
    var fips = String(f.id).padStart(5, "0");
    var c = centroid(f.geometry);
    var area = approxAreaSqMi(f.geometry);
    geoMap.set(fips, { lat: c.lat, lon: c.lon, areaSqMi: area });
  });

  console.log("\nCensus 2020 entries: " + pop2020Map.size);
  console.log("ACS 2022 entries: " + pop2022Map.size);
  console.log("TopoJSON features: " + geoMap.size + "\n");

  // Build unified county data using ACS 2022 as primary population
  // Group by state FIPS
  var stateCounties = {};

  // Use the union of 2022 ACS and 2020 Census keys
  var allFips = new Set([...pop2022Map.keys(), ...pop2020Map.keys()]);

  allFips.forEach(function(fips) {
    var stateFp = fips.substring(0, 2);

    var acs = pop2022Map.get(fips);
    var dec = pop2020Map.get(fips);
    var geo = geoMap.get(fips);

    // Use ACS population if available, otherwise Census 2020
    var population = acs ? acs.pop : (dec ? dec.pop : 0);
    var pop2020 = dec ? dec.pop : (acs ? acs.pop : 0);
    var rawName = acs ? acs.name : (dec ? dec.name : "");

    // Strip suffixes like " County, Alabama"
    var name = rawName
      .replace(/\s*(County|Parish|Borough|Census Area|Municipality|city|City and Borough|Municipio),.*$/, "")
      .trim();

    // Handle Virginia independent cities: "Name city, Virginia"
    if (rawName.match(/\bcity,\s/i) && !name) {
      name = rawName.replace(/,.*$/, "").trim();
    }

    if (!name) name = rawName.replace(/,.*$/, "").trim();

    var lat = geo ? geo.lat : 0;
    var lon = geo ? geo.lon : 0;
    var areaSqMi = geo ? geo.areaSqMi : 0;
    var density = areaSqMi > 0 ? Math.round((population / areaSqMi) * 10) / 10 : 0;
    var change = pop2020 > 0
      ? Math.round(((population - pop2020) / pop2020) * 1000) / 10
      : 0;
    var region = FIPS_TO_REGION[stateFp] || "South";

    if (!stateCounties[stateFp]) stateCounties[stateFp] = [];
    stateCounties[stateFp].push({
      n: name,
      p: population,
      la: Math.round(lat * 100) / 100,
      lo: Math.round(lon * 100) / 100,
      dn: density,
      rg: region,
      cp: null,
      ar: Math.round(areaSqMi),
      ch: change,
      fips: fips,
      t: "county",
      parentFp: stateFp,
      parentIso: "USA"
    });
  });

  // Generate files for target FIPS codes
  var generated = 0;
  TARGET_FIPS.forEach(function(fp) {
    var counties = stateCounties[fp];
    if (!counties || counties.length === 0) {
      console.log("WARNING: No counties found for FIPS " + fp);
      return;
    }

    // Sort by population descending
    counties.sort(function(a, b) { return b.p - a.p; });

    var varName = "COUNTIES_" + fp;
    var lines = ["var " + varName + " = ["];
    counties.forEach(function(c, i) {
      var comma = i < counties.length - 1 ? "," : "";
      lines.push("  {n:" + JSON.stringify(c.n) + ",p:" + c.p + ",la:" + c.la + ",lo:" + c.lo +
        ",dn:" + c.dn + ",rg:" + JSON.stringify(c.rg) + ",cp:null,ar:" + c.ar +
        ",ch:" + c.ch + ",fips:" + JSON.stringify(c.fips) + ",t:\"county\",parentFp:" +
        JSON.stringify(c.parentFp) + ",parentIso:\"USA\"}" + comma);
    });
    lines.push("];");
    lines.push("export { " + varName + " };");
    lines.push("");

    var outPath = join(COUNTY_DIR, fp + ".js");
    writeFileSync(outPath, lines.join("\n"));
    console.log(fp + ": " + counties.length + " counties -> " + outPath);
    generated++;
  });

  console.log("\nDone! Generated " + generated + " county data files.");
}

main().catch(function(err) {
  console.error(err);
  process.exit(1);
});
