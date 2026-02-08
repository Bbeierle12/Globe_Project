import { COUNTRIES, ISO_MAP, findCountry } from "../../src/data/index.js";
import { ID_MAP } from "../../src/data/idMap.js";
import { pClr } from "../../src/cesium/topoUtils.js";
import { getSelectionKey, buildSubdivisionMaps } from "../../src/cesium/populationLayer.js";

describe("Data flow: ID_MAP -> findCountry -> COUNTRIES", function() {
  it("most ID_MAP entries resolve to a COUNTRIES entry", function() {
    var matchCount = 0;
    Object.keys(ID_MAP).forEach(function(code) {
      var country = findCountry(Number(code));
      if (country) {
        matchCount++;
        expect(country.iso).toBeTruthy();
        expect(ISO_MAP[country.iso]).toBe(country);
      }
    });
    expect(matchCount / Object.keys(ID_MAP).length).toBeGreaterThan(0.85);
  });
});

describe("Data flow: buildSubdivisionMaps uses real data", function() {
  it("produces maps consistent with COUNTRIES subdivisions", function() {
    var maps = buildSubdivisionMaps();
    if (maps.USA) {
      var values = Object.values(maps.USA);
      var cali = values.find(function(s) { return s.n === "California"; });
      expect(cali).toBeDefined();
      expect(cali.parentIso).toBe("USA");
    }
  });
});

describe("Data flow: pClr accepts real country populations", function() {
  it("generates valid colors for all countries", function() {
    COUNTRIES.forEach(function(c) {
      var rgb = pClr(c.p);
      expect(rgb[0]).toBeGreaterThanOrEqual(0);
      expect(rgb[0]).toBeLessThanOrEqual(255);
      expect(rgb[1]).toBeGreaterThanOrEqual(0);
      expect(rgb[1]).toBeLessThanOrEqual(255);
      expect(rgb[2]).toBeGreaterThanOrEqual(0);
      expect(rgb[2]).toBeLessThanOrEqual(255);
    });
  });
});

describe("Data flow: getSelectionKey uniqueness", function() {
  it("generates unique keys for all countries", function() {
    var keys = new Set();
    COUNTRIES.forEach(function(c) {
      var key = getSelectionKey(c);
      expect(key).not.toBeNull();
      expect(keys.has(key)).toBe(false);
      keys.add(key);
    });
  });

  it("generates unique keys for all subdivisions", function() {
    var keys = new Set();
    COUNTRIES.forEach(function(c) {
      (c.subdivisions || []).forEach(function(s) {
        var key = getSelectionKey(s);
        if (key) {
          expect(keys.has(key)).toBe(false);
          keys.add(key);
        }
      });
    });
  });
});
