export var USA_ENTRY = {
  n: "United States of America", p: 345426571, la: 37.09, lo: -95.71,
  t: "c", al: ["United States of America", "USA", "United States", "US", "America"],
  iso: "USA", subdivisionLabel: "State",
  subdivisions: [
    { n: "California", p: 38965193, la: 36.78, lo: -119.42, dn: 661.3, rg: "West", cp: "Sacramento", ar: 150003, sc: null, fp: "06", t: "s", parentIso: "USA" },
    { n: "Texas", p: 30503301, la: 31.97, lo: -99.9, dn: 291.9, rg: "South", cp: "Austin", ar: 172752, fp: "48", t: "s", parentIso: "USA" },
  ],
};

export var SUBDIVISION_ENTRY = {
  n: "California", p: 38965193, la: 36.78, lo: -119.42,
  t: "s", parentIso: "USA", fp: "06", rg: "West", cp: "Sacramento",
};

export var COUNTY_ENTRY = {
  n: "Harris", p: 5009302, la: 29.86, lo: -95.39,
  t: "county", fips: "48201", parentFp: "48", parentIso: "USA",
};

export var CITY_ENTRY = {
  t: "city", n: "New York", p: 8336817, la: 40.71, lo: -74.01,
  rg: "United States of America", cp: "New York",
};

export var SMALL_COUNTRIES = [
  {
    n: "CountryA", p: 100000000, iso: "AAA", t: "c", la: 10, lo: 20,
    al: ["CountryA", "CA"], subdivisionLabel: "State",
    subdivisions: [
      { n: "SubA1", p: 50000000, t: "s", parentIso: "AAA", sc: "01", la: 10, lo: 20, rg: "North", cp: "CapA1" },
      { n: "SubA2", p: 30000000, t: "s", parentIso: "AAA", sc: "02", la: 11, lo: 21, rg: "South", cp: "CapA2" },
    ],
  },
  {
    n: "CountryB", p: 50000000, iso: "BBB", t: "c", la: 30, lo: 40,
    al: ["CountryB"], subdivisionLabel: "Province",
    subdivisions: [],
  },
  {
    n: "CountryC", p: 200000000, iso: "CCC", t: "c", la: 50, lo: 60,
    al: ["CountryC"], subdivisionLabel: "Region",
    subdivisions: [
      { n: "SubC1", p: 120000000, t: "s", parentIso: "CCC", sc: "01", la: 50, lo: 60 },
    ],
  },
];
