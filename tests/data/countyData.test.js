import { COUNTY_FILE_MAP } from "../../src/data/us-counties/index.js";

describe("County data", function() {
  it("COUNTY_FILE_MAP has 10 state entries", function() {
    expect(Object.keys(COUNTY_FILE_MAP)).toHaveLength(10);
  });

  it("all entries are functions", function() {
    Object.values(COUNTY_FILE_MAP).forEach(function(loader) {
      expect(typeof loader).toBe("function");
    });
  });

  it("contains expected state FIPS codes", function() {
    var expected = ["06", "12", "13", "17", "26", "36", "37", "39", "42", "48"];
    expected.forEach(function(fp) {
      expect(COUNTY_FILE_MAP[fp]).toBeDefined();
    });
  });

  it("loads California counties (06) with valid structure", async function() {
    var mod = await COUNTY_FILE_MAP["06"]();
    var counties = mod.COUNTIES_06;
    expect(Array.isArray(counties)).toBe(true);
    expect(counties.length).toBeGreaterThan(0);
    counties.forEach(function(c) {
      expect(c.t).toBe("county");
      expect(c.parentIso).toBe("USA");
      expect(c.parentFp).toBe("06");
      expect(c.fips).toBeTruthy();
      expect(c.fips.startsWith("06")).toBe(true);
      expect(c.p).toBeGreaterThan(0);
    });
  });

  it("loads Texas counties (48) with valid structure", async function() {
    var mod = await COUNTY_FILE_MAP["48"]();
    var counties = mod.COUNTIES_48;
    expect(Array.isArray(counties)).toBe(true);
    expect(counties.length).toBeGreaterThan(200);
    counties.forEach(function(c) {
      expect(c.t).toBe("county");
      expect(c.parentFp).toBe("48");
      expect(c.fips.startsWith("48")).toBe(true);
    });
  });
});
