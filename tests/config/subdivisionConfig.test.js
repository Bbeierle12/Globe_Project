/**
 * TDD Contract: src/config/subdivisionConfig.js
 * Phase 0 — Write this test FIRST, then extract SUB_CONFIGS from data/index.js
 *
 * Validates the subdivision configuration structure after extraction
 * from the monolith data/index.js into its own config module.
 */

import { SUB_CONFIGS, COUNTY_CONFIG } from "../../src/config/subdivisionConfig.js";

describe("SUB_CONFIGS structure validation", function () {
  it("is a non-empty array", function () {
    expect(Array.isArray(SUB_CONFIGS)).toBe(true);
    expect(SUB_CONFIGS.length).toBeGreaterThan(0);
  });

  it("every config has required fields", function () {
    var requiredFields = ["iso", "url", "objectName", "codeField", "extractCode", "skipName"];

    SUB_CONFIGS.forEach(function (cfg) {
      requiredFields.forEach(function (field) {
        expect(cfg[field]).toBeDefined();
      });
      expect(typeof cfg.iso).toBe("string");
      expect(cfg.iso).toMatch(/^[A-Z]{3}$/);
      expect(typeof cfg.url).toBe("string");
      expect(cfg.url.length).toBeGreaterThan(0);
      expect(typeof cfg.objectName).toBe("string");
      expect(typeof cfg.codeField).toBe("string");
      expect(typeof cfg.extractCode).toBe("function");
      expect(typeof cfg.skipName).toBe("string");
    });
  });

  it("has no duplicate ISO codes", function () {
    var isos = SUB_CONFIGS.map(function (cfg) { return cfg.iso; });
    expect(new Set(isos).size).toBe(isos.length);
  });

  it("all extractCode functions accept a feature-like object", function () {
    var mockFeature = {
      id: "42",
      properties: {
        iso_3166_2: "US-CA",
        state_code: "06",
        id: "06",
        st_code: "06",
      },
    };

    SUB_CONFIGS.forEach(function (cfg) {
      var result = cfg.extractCode(mockFeature);
      // Should return string or null, never throw
      expect(result === null || typeof result === "string").toBe(true);
    });
  });

  it("contains the original 23 country configs", function () {
    var expectedIsos = [
      "USA", "CAN", "MEX", "IND", "CHN",
      "BRA", "COL", "PER", "ARG", "VEN",
      "CHL", "ECU", "BOL", "PRY", "URY",
      "GUY", "SUR", "GUF", "IDN", "PAK",
      "NGA", "BGD", "RUS",
    ];

    expectedIsos.forEach(function (iso) {
      var found = SUB_CONFIGS.find(function (cfg) { return cfg.iso === iso; });
      expect(found).toBeDefined();
    });
  });

  it("skipFeature is a function when present", function () {
    SUB_CONFIGS.forEach(function (cfg) {
      if (cfg.skipFeature !== undefined) {
        expect(typeof cfg.skipFeature).toBe("function");
      }
    });
  });

  it("all URLs are valid format (absolute URL or root-relative path)", function () {
    SUB_CONFIGS.forEach(function (cfg) {
      var isAbsolute = cfg.url.startsWith("http://") || cfg.url.startsWith("https://");
      var isRelative = cfg.url.startsWith("/");
      expect(isAbsolute || isRelative).toBe(true);
    });
  });
});

describe("COUNTY_CONFIG structure validation", function () {
  it("has required fields", function () {
    expect(COUNTY_CONFIG.topoUrl).toBeDefined();
    expect(typeof COUNTY_CONFIG.topoUrl).toBe("string");
    expect(COUNTY_CONFIG.objectName).toBe("counties");
    expect(typeof COUNTY_CONFIG.extractCode).toBe("function");
    expect(typeof COUNTY_CONFIG.extractStateFips).toBe("function");
  });

  it("extractCode returns string from feature id", function () {
    var result = COUNTY_CONFIG.extractCode({ id: 48201 });
    expect(result).toBe("48201");
  });

  it("extractStateFips returns first 2 digits", function () {
    var result = COUNTY_CONFIG.extractStateFips({ id: 48201 });
    expect(result).toBe("48");
  });
});
