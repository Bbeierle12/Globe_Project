/**
 * TDD Contract: New subdivision data for Phase 2 countries
 * Phase 2 — Write this test FIRST, then add subdivision data to countries.js
 *
 * Validates that 15 high-population countries with empty subdivisions arrays
 * have properly structured subdivision data before any rendering work begins.
 */

import { COUNTRIES, ISO_MAP } from "../../src/data/index.js";
import { SUB_CONFIGS } from "../../src/config/subdivisionConfig.js";

var PHASE_2_COUNTRIES = [
  { iso: "ETH", name: "Ethiopia", expectedMinSubs: 11, label: "Region" },
  { iso: "EGY", name: "Egypt", expectedMinSubs: 27, label: "Governorate" },
  { iso: "PHL", name: "Philippines", expectedMinSubs: 17, label: "Region" },
  { iso: "COD", name: "DR Congo", expectedMinSubs: 11, label: "Province" },
  { iso: "VNM", name: "Vietnam", expectedMinSubs: 58, label: "Province" },
  { iso: "IRN", name: "Iran", expectedMinSubs: 31, label: "Province" },
  { iso: "TUR", name: "Turkey", expectedMinSubs: 81, label: "Province" },
  { iso: "TZA", name: "Tanzania", expectedMinSubs: 26, label: "Region" },
  { iso: "THA", name: "Thailand", expectedMinSubs: 76, label: "Province" },
  { iso: "ZAF", name: "South Africa", expectedMinSubs: 9, label: "Province" },
  { iso: "ITA", name: "Italy", expectedMinSubs: 20, label: "Region" },
  { iso: "KEN", name: "Kenya", expectedMinSubs: 8, label: "County" },
  { iso: "MMR", name: "Myanmar", expectedMinSubs: 14, label: "State" },
  { iso: "ESP", name: "Spain", expectedMinSubs: 17, label: "Community" },
  { iso: "POL", name: "Poland", expectedMinSubs: 16, label: "Voivodeship" },
];

describe("Phase 2 subdivision data integrity", function () {
  PHASE_2_COUNTRIES.forEach(function (spec) {
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

describe("Phase 2 SUB_CONFIGS entries", function () {
  var NEW_ISOS = ["ETH", "EGY", "PHL", "COD", "VNM", "IRN", "TUR", "TZA", "THA", "ZAF", "ITA", "KEN", "MMR", "ESP", "POL"];

  it("all 15 new ISOs have matching entries in SUB_CONFIGS", function () {
    NEW_ISOS.forEach(function (iso) {
      var found = SUB_CONFIGS.find(function (cfg) { return cfg.iso === iso; });
      expect(found).toBeDefined();
    });
  });
});
