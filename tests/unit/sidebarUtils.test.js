import { fmt, tier, itemKey } from "../../src/components/Sidebar.jsx";

describe("fmt", function() {
  it("formats billions with 2 decimals", function() {
    expect(fmt(1500000000)).toBe("1.50B");
    expect(fmt(1000000000)).toBe("1.00B");
  });

  it("formats millions with 1 decimal", function() {
    expect(fmt(1500000)).toBe("1.5M");
    expect(fmt(5000000)).toBe("5.0M");
  });

  it("formats thousands with 1 decimal", function() {
    expect(fmt(200000)).toBe("200.0K");
    expect(fmt(1000)).toBe("1.0K");
  });

  it("formats small numbers as strings", function() {
    expect(fmt(999)).toBe("999");
    expect(fmt(0)).toBe("0");
    expect(fmt(1)).toBe("1");
  });

  it("handles exact boundaries", function() {
    expect(fmt(1e9)).toBe("1.00B");
    expect(fmt(1e6)).toBe("1.0M");
    expect(fmt(1e3)).toBe("1.0K");
  });
});

describe("tier", function() {
  it("returns Mega for >= 20M", function() {
    expect(tier(20000000)).toEqual({ l: "Mega", c: "#e74c3c" });
    expect(tier(50000000)).toEqual({ l: "Mega", c: "#e74c3c" });
  });

  it("returns Large for 10M-20M", function() {
    expect(tier(10000000)).toEqual({ l: "Large", c: "#e67e22" });
    expect(tier(19999999)).toEqual({ l: "Large", c: "#e67e22" });
  });

  it("returns Medium for 5M-10M", function() {
    expect(tier(5000000)).toEqual({ l: "Medium", c: "#b7950b" });
    expect(tier(9999999)).toEqual({ l: "Medium", c: "#b7950b" });
  });

  it("returns Small for 1M-5M", function() {
    expect(tier(1000000)).toEqual({ l: "Small", c: "#16a085" });
    expect(tier(4999999)).toEqual({ l: "Small", c: "#16a085" });
  });

  it("returns Micro for < 1M", function() {
    expect(tier(999999)).toEqual({ l: "Micro", c: "#2980b9" });
    expect(tier(0)).toEqual({ l: "Micro", c: "#2980b9" });
  });
});

describe("itemKey", function() {
  it("generates county key", function() {
    expect(itemKey({ t: "county", fips: "48201" })).toBe("county:48201");
  });

  it("generates subdivision key using fp", function() {
    expect(itemKey({ t: "s", parentIso: "USA", fp: "06", n: "California" })).toBe("s:USA:06");
  });

  it("generates subdivision key using sc when fp missing", function() {
    expect(itemKey({ t: "s", parentIso: "IND", sc: "09", n: "UP" })).toBe("s:IND:09");
  });

  it("generates subdivision key using name as fallback", function() {
    expect(itemKey({ t: "s", parentIso: "BRA", n: "Test" })).toBe("s:BRA:Test");
  });

  it("generates city key", function() {
    expect(itemKey({ t: "city", la: 40.71, lo: -74.01 })).toBe("city:40.71:-74.01");
  });

  it("generates country key", function() {
    expect(itemKey({ iso: "USA" })).toBe("c:USA");
  });
});
