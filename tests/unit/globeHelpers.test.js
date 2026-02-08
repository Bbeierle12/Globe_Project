import { markerSize, getEntryHeight, getPickedEntry } from "../../src/CesiumGlobe.jsx";
import { MP } from "../../src/data/index.js";

describe("markerSize", function() {
  it("returns base when population is 0", function() {
    expect(markerSize(0, 6, 11)).toBe(6);
  });

  it("returns base + range when population equals MP", function() {
    var result = markerSize(MP, 6, 11);
    expect(result).toBeCloseTo(6 + 11, 1);
  });

  it("returns value between base and base+range for mid population", function() {
    var result = markerSize(50000000, 6, 11);
    expect(result).toBeGreaterThan(6);
    expect(result).toBeLessThan(17);
  });

  it("increases monotonically with population", function() {
    var s1 = markerSize(1000000, 6, 11);
    var s2 = markerSize(10000000, 6, 11);
    var s3 = markerSize(100000000, 6, 11);
    expect(s2).toBeGreaterThan(s1);
    expect(s3).toBeGreaterThan(s2);
  });

  it("uses custom base and range values", function() {
    var result = markerSize(0, 10, 20);
    expect(result).toBe(10);
  });
});

describe("getEntryHeight", function() {
  it("returns 0 for null", function() {
    expect(getEntryHeight(null)).toBe(0);
  });

  it("returns 0 for undefined", function() {
    expect(getEntryHeight(undefined)).toBe(0);
  });

  it("returns 3000000 for countries", function() {
    expect(getEntryHeight({ t: "c" })).toBe(3000000);
  });

  it("returns 800000 for subdivisions", function() {
    expect(getEntryHeight({ t: "s" })).toBe(800000);
  });

  it("returns 200000 for counties", function() {
    expect(getEntryHeight({ t: "county" })).toBe(200000);
  });

  it("returns 220000 for cities", function() {
    expect(getEntryHeight({ t: "city" })).toBe(220000);
  });

  it("returns 1200000 for unknown types", function() {
    expect(getEntryHeight({ t: "other" })).toBe(1200000);
  });
});

describe("getPickedEntry", function() {
  it("returns null for null pick", function() {
    expect(getPickedEntry(null)).toBeNull();
  });

  it("returns entry from pick.id.__entry", function() {
    var entry = { t: "c", n: "Test" };
    expect(getPickedEntry({ id: { __entry: entry } })).toBe(entry);
  });

  it("returns null when pick.id has no __entry", function() {
    expect(getPickedEntry({ id: {} })).toBeNull();
  });

  it("returns null when pick has no id", function() {
    expect(getPickedEntry({})).toBeNull();
  });
});
