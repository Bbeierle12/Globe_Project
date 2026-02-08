import { ID_MAP } from "../../src/data/idMap.js";

describe("ID_MAP data integrity", function() {
  it("has at least 170 entries", function() {
    expect(Object.keys(ID_MAP).length).toBeGreaterThanOrEqual(170);
  });

  it("all keys are numeric strings", function() {
    Object.keys(ID_MAP).forEach(function(key) {
      expect(Number.isFinite(Number(key))).toBe(true);
    });
  });

  it("all values are non-empty strings", function() {
    Object.values(ID_MAP).forEach(function(val) {
      expect(typeof val).toBe("string");
      expect(val.length).toBeGreaterThan(0);
    });
  });

  it("contains expected major countries", function() {
    expect(ID_MAP["840"]).toBe("United States of America");
    expect(ID_MAP["156"]).toBe("China");
    expect(ID_MAP["356"]).toBe("India");
    expect(ID_MAP["076"]).toBe("Brazil");
    expect(ID_MAP["643"]).toBe("Russia");
  });
});
