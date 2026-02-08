import { buildSortedList, matchEntry, hasSubMatch, hasCountyMatch } from "../../src/utils/sidebarLogic.js";
import { SMALL_COUNTRIES } from "../fixtures/sampleCountry.js";

describe("matchEntry", function() {
  var entry = { n: "California", rg: "West", cp: "Sacramento", al: ["CA", "Golden State"] };

  it("matches by name", function() {
    expect(matchEntry(entry, "calif")).toBe(true);
  });

  it("matches by region", function() {
    expect(matchEntry(entry, "west")).toBe(true);
  });

  it("matches by capital", function() {
    expect(matchEntry(entry, "sacr")).toBe(true);
  });

  it("matches by alias", function() {
    expect(matchEntry(entry, "golden")).toBe(true);
  });

  it("returns false for non-match", function() {
    expect(matchEntry(entry, "zzz")).toBe(false);
  });

  it("expects caller to lowercase the query (buildSortedList does this)", function() {
    expect(matchEntry(entry, "california")).toBe(true);
    expect(matchEntry(entry, "CALIFORNIA")).toBeFalsy();
  });

  it("handles entry without optional fields", function() {
    expect(matchEntry({ n: "Test" }, "test")).toBe(true);
    expect(matchEntry({ n: "Test" }, "zzz")).toBeFalsy();
  });

  it("matches empty query to everything", function() {
    expect(matchEntry(entry, "")).toBe(true);
  });
});

describe("hasSubMatch", function() {
  it("returns true when a subdivision matches", function() {
    var country = {
      n: "TestCountry",
      subdivisions: [
        { n: "SubA", rg: "North" },
        { n: "SubB", rg: "South" },
      ],
    };
    expect(hasSubMatch(country, "subb")).toBe(true);
  });

  it("returns false when no subdivision matches", function() {
    var country = { n: "TestCountry", subdivisions: [{ n: "SubA" }] };
    expect(hasSubMatch(country, "zzz")).toBe(false);
  });

  it("returns false when no subdivisions", function() {
    expect(hasSubMatch({ n: "Test" }, "test")).toBe(false);
    expect(hasSubMatch({ n: "Test", subdivisions: [] }, "test")).toBe(false);
  });
});

describe("hasCountyMatch", function() {
  it("returns true when a loaded county matches", function() {
    var sub = { parentIso: "USA", fp: "48" };
    var loaded = { "48": [{ n: "Harris", rg: "South" }] };
    expect(hasCountyMatch(sub, "harris", loaded)).toBe(true);
  });

  it("returns false for non-USA subdivisions", function() {
    var sub = { parentIso: "IND", fp: "09" };
    expect(hasCountyMatch(sub, "test", {})).toBe(false);
  });

  it("returns false when counties not loaded", function() {
    var sub = { parentIso: "USA", fp: "48" };
    expect(hasCountyMatch(sub, "harris", {})).toBe(false);
  });

  it("returns false when fp is missing", function() {
    var sub = { parentIso: "USA" };
    expect(hasCountyMatch(sub, "test", {})).toBe(false);
  });
});

describe("buildSortedList", function() {
  it("returns all countries sorted by population descending", function() {
    var result = buildSortedList({
      countries: SMALL_COUNTRIES, search: "", expanded: {}, expandedStates: {}, loadedCounties: {},
    });
    expect(result.length).toBe(3);
    expect(result[0].entry.n).toBe("CountryC");
    expect(result[1].entry.n).toBe("CountryA");
    expect(result[2].entry.n).toBe("CountryB");
  });

  it("all items have depth 0 when nothing expanded", function() {
    var result = buildSortedList({
      countries: SMALL_COUNTRIES, search: "", expanded: {}, expandedStates: {}, loadedCounties: {},
    });
    result.forEach(function(item) {
      expect(item.depth).toBe(0);
    });
  });

  it("includes subdivisions when country is expanded", function() {
    var result = buildSortedList({
      countries: SMALL_COUNTRIES, search: "", expanded: { AAA: true }, expandedStates: {}, loadedCounties: {},
    });
    expect(result.length).toBe(5);
    expect(result[1].entry.n).toBe("CountryA");
    expect(result[2].depth).toBe(1);
    expect(result[2].entry.n).toBe("SubA1");
    expect(result[3].depth).toBe(1);
    expect(result[3].entry.n).toBe("SubA2");
  });

  it("filters countries by search query", function() {
    var result = buildSortedList({
      countries: SMALL_COUNTRIES, search: "CountryB", expanded: {}, expandedStates: {}, loadedCounties: {},
    });
    expect(result.length).toBe(1);
    expect(result[0].entry.n).toBe("CountryB");
  });

  it("shows subdivisions when search matches subdivision name", function() {
    var result = buildSortedList({
      countries: SMALL_COUNTRIES, search: "SubA2", expanded: {}, expandedStates: {}, loadedCounties: {},
    });
    expect(result.some(function(r) { return r.entry.n === "CountryA"; })).toBe(true);
    expect(result.some(function(r) { return r.entry.n === "SubA2"; })).toBe(true);
  });

  it("returns empty list when search matches nothing", function() {
    var result = buildSortedList({
      countries: SMALL_COUNTRIES, search: "zzzzz", expanded: {}, expandedStates: {}, loadedCounties: {},
    });
    expect(result.length).toBe(0);
  });

  it("handles empty countries array", function() {
    var result = buildSortedList({
      countries: [], search: "", expanded: {}, expandedStates: {}, loadedCounties: {},
    });
    expect(result.length).toBe(0);
  });
});
