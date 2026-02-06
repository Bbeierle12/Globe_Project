import { ID_MAP } from "./idMap.js";
import { COUNTRIES } from "./countries.js";

var ISO_MAP = {};
COUNTRIES.forEach(function(c) { ISO_MAP[c.iso] = c; });

var MP = 0;
COUNTRIES.forEach(function(c) { if (c.p > MP) MP = c.p; });

var WORLD_POP = 0;
COUNTRIES.forEach(function(c) { WORLD_POP += c.p; });

var RC = { South: "#e67e22", West: "#2e86c1", Midwest: "#27ae60", Northeast: "#8e44ad" };

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
