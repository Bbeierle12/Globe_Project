/**
 * TDD Contract: New subdivision data for Phase 1 countries
 * Phase 1 — Write this test FIRST, then add subdivision data to countries.js
 *
 * Validates that Germany, France, Australia, Japan, UK, South Korea
 * have properly structured subdivision data before any rendering work begins.
 */

import { COUNTRIES, ISO_MAP } from "../../src/data/index.js";

var PHASE_1_COUNTRIES = [
  { iso: "DEU", name: "Germany", expectedMinSubs: 16, label: "State" },
  { iso: "FRA", name: "France", expectedMinSubs: 13, label: "Region" },
  { iso: "AUS", name: "Australia", expectedMinSubs: 8, label: "State" },
  { iso: "JPN", name: "Japan", expectedMinSubs: 47, label: "Prefecture" },
  { iso: "GBR", name: "United Kingdom", expectedMinSubs: 4, label: "Country" },
  { iso: "KOR", name: "South Korea", expectedMinSubs: 17, label: "Province" },
];

describe("Phase 1 subdivision data integrity", function () {
  PHASE_1_COUNTRIES.forEach(function (spec) {
    describe(spec.name + " (" + spec.iso + ")", function () {
      var country;

      beforeAll(function () {
        country = ISO_MAP[spec.iso];
      });

      it("exists in COUNTRIES array", function () {
        expect(country).toBeDefined();
        expect(country.n).toBeTruthy();
        expect(country.iso).toBe(spec.iso);
      });

      it("has subdivisions array with at least " + spec.expectedMinSubs + " entries", function () {
        expect(Array.isArray(country.subdivisions)).toBe(true);
        expect(country.subdivisions.length).toBeGreaterThanOrEqual(spec.expectedMinSubs);
      });

      it("every subdivision has required fields", function () {
        country.subdivisions.forEach(function (s) {
          expect(s.n).toBeTruthy();
          expect(s.p).toBeGreaterThan(0);
          expect(Number.isFinite(s.la)).toBe(true);
          expect(Number.isFinite(s.lo)).toBe(true);
          expect(s.la).toBeGreaterThanOrEqual(-90);
          expect(s.la).toBeLessThanOrEqual(90);
          expect(s.lo).toBeGreaterThanOrEqual(-180);
          expect(s.lo).toBeLessThanOrEqual(180);
          expect(s.t).toBe("s");
          expect(s.parentIso).toBe(spec.iso);
          expect(s.sc).toBeTruthy();
        });
      });

      it("all subdivision codes (sc) are unique", function () {
        var codes = country.subdivisions.map(function (s) { return s.sc; });
        expect(new Set(codes).size).toBe(codes.length);
      });

      it("subdivision populations sum to within 15% of country total", function () {
        var subTotal = country.subdivisions.reduce(function (sum, s) { return sum + s.p; }, 0);
        var ratio = subTotal / country.p;
        // Allow 15% tolerance for overseas territories, rounding, etc.
        expect(ratio).toBeGreaterThan(0.85);
        expect(ratio).toBeLessThan(1.15);
      });

      it("every subdivision has a region code (rg)", function () {
        country.subdivisions.forEach(function (s) {
          expect(s.rg).toBeTruthy();
          expect(typeof s.rg).toBe("string");
        });
      });

      it("every subdivision has a capital (cp)", function () {
        country.subdivisions.forEach(function (s) {
          expect(s.cp).toBeTruthy();
          expect(typeof s.cp).toBe("string");
        });
      });
    });
  });
});

describe("Phase 1 SUB_CONFIGS entries", function () {
  // This test validates that the new countries have corresponding
  // SUB_CONFIGS entries with TopoJSON URLs.
  // Import will come from config once Phase 0 extraction is done.

  var NEW_ISOS = ["DEU", "FRA", "AUS", "JPN", "GBR", "KOR"];

  it("all 6 new ISOs have matching entries in data/index.js SUB_CONFIGS", function () {
    // After Phase 0, this import path changes to config/subdivisionConfig.js
    var { SUB_CONFIGS } = require("../../src/data/index.js");

    NEW_ISOS.forEach(function (iso) {
      var found = SUB_CONFIGS.find(function (cfg) { return cfg.iso === iso; });
      expect(found).toBeDefined();
    });
  });
});
