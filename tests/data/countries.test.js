import { COUNTRIES } from "../../src/data/countries.js";

describe("COUNTRIES data integrity", function() {
  it("contains at least 170 countries", function() {
    expect(COUNTRIES.length).toBeGreaterThanOrEqual(170);
  });

  it("every country has required fields", function() {
    COUNTRIES.forEach(function(c) {
      expect(c.n).toBeTruthy();
      expect(c.p).toBeGreaterThanOrEqual(0);
      expect(c.la).toBeDefined();
      expect(c.lo).toBeDefined();
      expect(c.t).toBe("c");
      expect(c.iso).toMatch(/^[A-Z]{3}$/);
    });
  });

  it("all ISO codes are unique", function() {
    var isos = COUNTRIES.map(function(c) { return c.iso; });
    expect(new Set(isos).size).toBe(isos.length);
  });

  it("all subdivisions reference their parent correctly", function() {
    COUNTRIES.forEach(function(c) {
      (c.subdivisions || []).forEach(function(s) {
        expect(s.t).toBe("s");
        expect(s.parentIso).toBe(c.iso);
        expect(s.n).toBeTruthy();
        expect(s.p).toBeGreaterThan(0);
      });
    });
  });

  it("latitudes are in range [-90, 90]", function() {
    COUNTRIES.forEach(function(c) {
      expect(c.la).toBeGreaterThanOrEqual(-90);
      expect(c.la).toBeLessThanOrEqual(90);
    });
  });

  it("longitudes are in range [-180, 180]", function() {
    COUNTRIES.forEach(function(c) {
      expect(c.lo).toBeGreaterThanOrEqual(-180);
      expect(c.lo).toBeLessThanOrEqual(180);
    });
  });

  it("every country has aliases array", function() {
    COUNTRIES.forEach(function(c) {
      expect(Array.isArray(c.al)).toBe(true);
      expect(c.al.length).toBeGreaterThan(0);
    });
  });
});
