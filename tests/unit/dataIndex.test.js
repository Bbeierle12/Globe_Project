import { findCountry, extractIso3166_2Suffix, ISO_MAP, MP, WORLD_POP, COUNTRIES } from "../../src/data/index.js";

describe("findCountry", function() {
  it("finds USA by numeric code 840", function() {
    var result = findCountry(840);
    expect(result).not.toBeNull();
    expect(result.iso).toBe("USA");
  });

  it("finds India by numeric code 356", function() {
    var result = findCountry(356);
    expect(result).not.toBeNull();
    expect(result.iso).toBe("IND");
  });

  it("finds China by numeric code 156", function() {
    var result = findCountry(156);
    expect(result).not.toBeNull();
    expect(result.iso).toBe("CHN");
  });

  it("returns null for unknown code", function() {
    expect(findCountry(999999)).toBeNull();
  });

  it("returns null for empty string", function() {
    expect(findCountry("")).toBeNull();
  });

  it("handles string numeric codes", function() {
    var result = findCountry("840");
    expect(result).not.toBeNull();
    expect(result.iso).toBe("USA");
  });
});

describe("extractIso3166_2Suffix", function() {
  it("extracts suffix from ISO 3166-2 code", function() {
    expect(extractIso3166_2Suffix({ properties: { iso_3166_2: "BR-SP" } })).toBe("SP");
  });

  it("extracts suffix from longer codes", function() {
    expect(extractIso3166_2Suffix({ properties: { iso_3166_2: "RU-MOW" } })).toBe("MOW");
  });

  it("returns null when properties missing", function() {
    expect(extractIso3166_2Suffix({})).toBeNull();
  });

  it("returns null when iso_3166_2 missing", function() {
    expect(extractIso3166_2Suffix({ properties: {} })).toBeNull();
  });

  it("returns full code when no dash present", function() {
    expect(extractIso3166_2Suffix({ properties: { iso_3166_2: "XX" } })).toBe("XX");
  });
});

describe("Computed data values", function() {
  it("MP is the maximum population across all countries", function() {
    var maxPop = Math.max.apply(null, COUNTRIES.map(function(c) { return c.p; }));
    expect(MP).toBe(maxPop);
  });

  it("MP is greater than 1 billion", function() {
    expect(MP).toBeGreaterThan(1e9);
  });

  it("WORLD_POP is the sum of all country populations", function() {
    var sum = COUNTRIES.reduce(function(s, c) { return s + c.p; }, 0);
    expect(WORLD_POP).toBe(sum);
  });

  it("WORLD_POP is greater than 7 billion", function() {
    expect(WORLD_POP).toBeGreaterThan(7e9);
  });

  it("ISO_MAP has entry for every country ISO code", function() {
    COUNTRIES.forEach(function(c) {
      expect(ISO_MAP[c.iso]).toBe(c);
    });
  });
});
