function matchEntry(d, q) {
  return (
    d.n.toLowerCase().indexOf(q) >= 0 ||
    (d.rg && d.rg.toLowerCase().indexOf(q) >= 0) ||
    (d.cp && d.cp.toLowerCase().indexOf(q) >= 0) ||
    (d.al && d.al.some(function(a) { return a.toLowerCase().indexOf(q) >= 0; }))
  );
}

function hasSubMatch(c, q) {
  if (!c.subdivisions || c.subdivisions.length === 0) return false;
  return c.subdivisions.some(function(s) {
    return matchEntry(s, q);
  });
}

function hasCountyMatch(s, q, loadedCounties) {
  if (s.parentIso !== "USA" || !s.fp || !loadedCounties[s.fp]) return false;
  return loadedCounties[s.fp].some(function(c) {
    return matchEntry(c, q);
  });
}

function buildSortedList(params) {
  var allCountries = params.countries;
  var search = params.search;
  var expanded = params.expanded;
  var expandedStates = params.expandedStates;
  var loadedCounties = params.loadedCounties;

  var countries = allCountries.slice();
  var q = search ? search.toLowerCase() : "";

  if (q) {
    countries = countries.filter(function(c) {
      return matchEntry(c, q) || hasSubMatch(c, q);
    });
  }
  countries.sort(function(a, b) {
    return b.p - a.p;
  });

  var list = [];
  countries.forEach(function(c) {
    list.push({ entry: c, depth: 0 });
    var showSubs = expanded[c.iso] || (q && hasSubMatch(c, q));
    if (showSubs && c.subdivisions && c.subdivisions.length > 0) {
      var subs = c.subdivisions.slice().sort(function(a, b) {
        return b.p - a.p;
      });
      if (q) {
        subs = subs.filter(function(s) {
          return matchEntry(s, q) || hasCountyMatch(s, q, loadedCounties);
        });
      }
      subs.forEach(function(s) {
        list.push({ entry: s, depth: 1 });
        var showCounties =
          s.parentIso === "USA" && s.fp && (expandedStates[s.fp] || (q && hasCountyMatch(s, q, loadedCounties)));
        if (showCounties && loadedCounties[s.fp]) {
          var counties = loadedCounties[s.fp].slice().sort(function(a, b) {
            return b.p - a.p;
          });
          if (q) {
            counties = counties.filter(function(ct) {
              return matchEntry(ct, q);
            });
          }
          counties.forEach(function(ct) {
            list.push({ entry: ct, depth: 2 });
          });
        }
      });
    }
  });

  return list;
}

export { buildSortedList, matchEntry, hasSubMatch, hasCountyMatch };
