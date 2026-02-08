import { getSelectionKey, buildSubdivisionMaps } from "../../src/cesium/populationLayer.js";
import { USA_ENTRY, SUBDIVISION_ENTRY, COUNTY_ENTRY, CITY_ENTRY } from "../fixtures/sampleCountry.js";

describe("getSelectionKey", function() {
  it("returns null for null", function() {
    expect(getSelectionKey(null)).toBeNull();
  });

  it("returns null for undefined", function() {
    expect(getSelectionKey(undefined)).toBeNull();
  });

  it("generates country key with c: prefix", function() {
    expect(getSelectionKey(USA_ENTRY)).toBe("c:USA");
  });

  it("generates subdivision key with s: prefix using fp", function() {
    expect(getSelectionKey(SUBDIVISION_ENTRY)).toBe("s:USA:06");
  });

  it("generates county key with county: prefix", function() {
    expect(getSelectionKey(COUNTY_ENTRY)).toBe("county:48201");
  });

  it("generates city key with city: prefix", function() {
    expect(getSelectionKey(CITY_ENTRY)).toBe("city:New York:40.71:-74.01");
  });

  it("uses sc when fp is missing for subdivision", function() {
    var entry = { t: "s", parentIso: "IND", sc: "09", n: "Test" };
    expect(getSelectionKey(entry)).toBe("s:IND:09");
  });

  it("uses name as fallback for subdivision key", function() {
    var entry = { t: "s", parentIso: "BRA", n: "Sao Paulo" };
    expect(getSelectionKey(entry)).toBe("s:BRA:Sao Paulo");
  });

  it("returns null for unknown entry type", function() {
    expect(getSelectionKey({ t: "unknown" })).toBeNull();
  });
});

describe("buildSubdivisionMaps", function() {
  it("returns an object with ISO keys", function() {
    var maps = buildSubdivisionMaps();
    expect(typeof maps).toBe("object");
    expect(Object.keys(maps).length).toBeGreaterThan(0);
  });

  it("includes USA in the maps", function() {
    var maps = buildSubdivisionMaps();
    expect(maps.USA).toBeDefined();
  });

  it("includes IND in the maps", function() {
    var maps = buildSubdivisionMaps();
    expect(maps.IND).toBeDefined();
  });
});
