import { ID_MAP } from "./idMap.js";
import { COUNTRIES } from "./countries.js";

var ISO_MAP = {};
COUNTRIES.forEach(function(c) { ISO_MAP[c.iso] = c; });

var MP = 0;
COUNTRIES.forEach(function(c) { if (c.p > MP) MP = c.p; });

var WORLD_POP = 0;
COUNTRIES.forEach(function(c) { WORLD_POP += c.p; });

var RC = { South: "#e67e22", West: "#2e86c1", Midwest: "#27ae60", Northeast: "#8e44ad", Atlantic: "#1abc9c", Central: "#e74c3c", Prairies: "#d4ac0d", "West Coast": "#3498db", North: "#7f8c8d", "MX Central": "#e74c3c", "MX Northwest": "#2e86c1", "MX Northeast": "#e67e22", "MX West": "#27ae60", "MX South": "#8e44ad", "MX Southeast": "#1abc9c", "IN North": "#e67e22", "IN South": "#27ae60", "IN East": "#2e86c1", "IN West": "#e74c3c", "IN Central": "#d4ac0d", "IN Northeast": "#8e44ad" };

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

export { COUNTRIES, ID_MAP, ISO_MAP, MP, WORLD_POP, RC, findCountry };
