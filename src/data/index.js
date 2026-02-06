import { ID_MAP } from "./idMap.js";
import { COUNTRIES } from "./countries.js";

var ISO_MAP = {};
COUNTRIES.forEach(function(c) { ISO_MAP[c.iso] = c; });

var MP = 0;
COUNTRIES.forEach(function(c) { if (c.p > MP) MP = c.p; });

var WORLD_POP = 0;
COUNTRIES.forEach(function(c) { WORLD_POP += c.p; });

var RC = { South: "#e67e22", West: "#2e86c1", Midwest: "#27ae60", Northeast: "#8e44ad", Atlantic: "#1abc9c", Central: "#e74c3c", Prairies: "#d4ac0d", "West Coast": "#3498db", North: "#7f8c8d", "MX Central": "#e74c3c", "MX Northwest": "#2e86c1", "MX Northeast": "#e67e22", "MX West": "#27ae60", "MX South": "#8e44ad", "MX Southeast": "#1abc9c", "IN North": "#e67e22", "IN South": "#27ae60", "IN East": "#2e86c1", "IN West": "#e74c3c", "IN Central": "#d4ac0d", "IN Northeast": "#8e44ad", "CN North": "#e74c3c", "CN Northeast": "#2e86c1", "CN East": "#27ae60", "CN South Central": "#e67e22", "CN Southwest": "#8e44ad", "CN Northwest": "#d4ac0d", "BR Southeast": "#e74c3c", "BR South": "#2e86c1", "BR Northeast": "#e67e22", "BR North": "#27ae60", "BR Central-West": "#d4ac0d", "CO Andean": "#e74c3c", "CO Caribbean": "#2e86c1", "CO Pacific": "#27ae60", "CO Orinoco": "#e67e22", "CO Amazon": "#8e44ad", "PE Coast": "#e74c3c", "PE Sierra": "#27ae60", "PE Selva": "#2e86c1" };

var SUB_CONFIGS = [
  {
    iso: "USA",
    url: "https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json",
    objectName: "states",
    codeField: "fp",
    extractCode: function(f) { return String(f.id).padStart(2, "0"); },
    skipName: "United States of America"
  },
  {
    iso: "CAN",
    url: "https://gist.githubusercontent.com/Brideau/2391df60938462571ca9/raw/f5a1f3b47ff671eaf2fb7e7b798bacfc6962606a/canadaprovtopo.json",
    objectName: "canadaprov",
    codeField: "pc",
    extractCode: function(f) { return (f.properties && f.properties.id) || f.id || null; },
    skipName: "Canada"
  },
  {
    iso: "MEX",
    url: "https://gist.githubusercontent.com/diegovalle/5129746/raw/c1c35e439b1d5e688bca20b79f0e53a1fc12bf9e/mx_tj.json",
    objectName: "states",
    codeField: "sc",
    extractCode: function(f) {
      return f.properties && f.properties.state_code != null
        ? String(f.properties.state_code).padStart(2, "0") : null;
    },
    skipName: "Mexico"
  },
  {
    iso: "IND",
    url: "https://cdn.jsdelivr.net/gh/udit-001/india-maps-data@ef25ebc/topojson/india.json",
    objectName: "states",
    codeField: "sc",
    extractCode: function(f) {
      return f.properties && f.properties.st_code != null
        ? String(f.properties.st_code).padStart(2, "0") : null;
    },
    skipName: "India"
  },
  {
    iso: "CHN",
    url: "https://cdn.jsdelivr.net/npm/cn-atlas@0.1.2/cn-atlas.json",
    objectName: "provinces",
    codeField: "sc",
    extractCode: function(f) { return String(f.properties.id || f.id || "").substring(0, 2); },
    skipFeature: function(f) {
      var code = String(f.properties.id || f.id || "").substring(0, 2);
      return code === "71";
    },
    skipName: "China"
  },
  {
    iso: "BRA",
    url: "/topo/br-states.json",
    objectName: "ne_10m_admin_1_states_provinces",
    codeField: "sc",
    extractCode: function(f) {
      var code = f.properties && f.properties.iso_3166_2;
      if (!code) return null;
      var parts = code.split("-");
      return parts.length > 1 ? parts[1] : code;
    },
    skipName: "Brazil"
  },
  {
    iso: "COL",
    url: "/topo/co-departments.json",
    objectName: "ne_10m_admin_1_states_provinces",
    codeField: "sc",
    extractCode: function(f) {
      var code = f.properties && f.properties.iso_3166_2;
      if (!code) return null;
      var parts = code.split("-");
      return parts.length > 1 ? parts[1] : code;
    },
    skipName: "Colombia"
  },
  {
    iso: "PER",
    url: "/topo/pe-regions.json",
    objectName: "ne_10m_admin_1_states_provinces",
    codeField: "sc",
    extractCode: function(f) {
      var code = f.properties && f.properties.iso_3166_2;
      if (!code) return null;
      var parts = code.split("-");
      return parts.length > 1 ? parts[1] : code;
    },
    skipName: "Peru"
  }
];

function findCountry(featureId) {
  var name = ID_MAP[String(featureId)];
  if (!name) return null;
  var nl = name.toLowerCase();
  for (var i = 0; i < COUNTRIES.length; i++) {
    var c = COUNTRIES[i];
    if (c.al) {
      for (var j = 0; j < c.al.length; j++) {
        if (c.al[j].toLowerCase() === nl) return c;
      }
    }
  }
  return null;
}

export { COUNTRIES, ID_MAP, ISO_MAP, MP, WORLD_POP, RC, SUB_CONFIGS, findCountry };
