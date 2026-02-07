import { useMemo } from "react";
import { COUNTRIES, ISO_MAP, WORLD_POP, MP, RC } from "../data/index.js";
import { COUNTY_FILE_MAP } from "../data/us-counties/index.js";
import { pClr } from "../cesium/topoUtils.js";

function fmt(n) {
  if (n >= 1e9) return (n / 1e9).toFixed(2) + "B";
  if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(1) + "K";
  return String(n);
}

function tier(p) {
  if (p >= 2e7) return { l: "Mega", c: "#e74c3c" };
  if (p >= 1e7) return { l: "Large", c: "#e67e22" };
  if (p >= 5e6) return { l: "Medium", c: "#b7950b" };
  if (p >= 1e6) return { l: "Small", c: "#16a085" };
  return { l: "Micro", c: "#2980b9" };
}

export default function Sidebar(props) {
  var search = props.search;
  var setSearch = props.setSearch;
  var autoR = props.autoR;
  var setAutoR = props.setAutoR;
  var sel = props.sel;
  var setSel = props.setSel;
  var expanded = props.expanded;
  var toggleExpand = props.toggleExpand;
  var expandedStates = props.expandedStates;
  var toggleExpandState = props.toggleExpandState;
  var countyLoading = props.countyLoading;
  var loadedCounties = props.loadedCounties;

  var sorted = useMemo(
    function() {
      var countries = COUNTRIES.slice();
      var q = search ? search.toLowerCase() : "";

      function matchEntry(d) {
        return (
          d.n.toLowerCase().indexOf(q) >= 0 ||
          (d.rg && d.rg.toLowerCase().indexOf(q) >= 0) ||
          (d.cp && d.cp.toLowerCase().indexOf(q) >= 0) ||
          (d.al && d.al.some(function(a) { return a.toLowerCase().indexOf(q) >= 0; }))
        );
      }

      function hasSubMatch(c) {
        if (!c.subdivisions || c.subdivisions.length === 0) return false;
        return c.subdivisions.some(function(s) {
          return matchEntry(s);
        });
      }

      function hasCountyMatch(s) {
        if (s.parentIso !== "USA" || !s.fp || !loadedCounties[s.fp]) return false;
        return loadedCounties[s.fp].some(function(c) {
          return matchEntry(c);
        });
      }

      if (q) {
        countries = countries.filter(function(c) {
          return matchEntry(c) || hasSubMatch(c);
        });
      }
      countries.sort(function(a, b) {
        return b.p - a.p;
      });

      var list = [];
      countries.forEach(function(c) {
        list.push({ entry: c, depth: 0 });
        var showSubs = expanded[c.iso] || (q && hasSubMatch(c));
        if (showSubs && c.subdivisions && c.subdivisions.length > 0) {
          var subs = c.subdivisions.slice().sort(function(a, b) {
            return b.p - a.p;
          });
          if (q) {
            subs = subs.filter(function(s) {
              return matchEntry(s) || hasCountyMatch(s);
            });
          }
          subs.forEach(function(s) {
            list.push({ entry: s, depth: 1 });
            var showCounties =
              s.parentIso === "USA" && s.fp && (expandedStates[s.fp] || (q && hasCountyMatch(s)));
            if (showCounties && loadedCounties[s.fp]) {
              var counties = loadedCounties[s.fp].slice().sort(function(a, b) {
                return b.p - a.p;
              });
              if (q) {
                counties = counties.filter(function(ct) {
                  return matchEntry(ct);
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
    },
    [search, expanded, expandedStates, loadedCounties],
  );

  var isSt = sel && sel.t === "s";
  var isCty = sel && sel.t === "county";
  var isCity = sel && sel.t === "city";
  var selParent = isSt && sel.parentIso ? ISO_MAP[sel.parentIso] : null;
  var selParentState =
    isCty && sel.parentFp
      ? ISO_MAP.USA
        ? ISO_MAP.USA.subdivisions.find(function(s) { return s.fp === sel.parentFp; })
        : null
      : null;

  return (
    <div
      style={{
        width: 330,
        background: "rgba(6,10,20,0.94)",
        borderLeft: "1px solid rgba(50,100,180,0.08)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        zIndex: 15,
      }}
    >
      <div style={{ padding: "12px 14px 8px", borderBottom: "1px solid rgba(50,100,180,0.06)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div
            style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: "#3a80e0",
              boxShadow: "0 0 8px #3a80e0",
            }}
          />
          <span style={{ fontSize: 16, fontWeight: 700, color: "#dce6f2" }}>Population Globe</span>
        </div>
        <div style={{ fontSize: 10, color: "#4a6a88", marginLeft: 13, marginTop: 2 }}>
          {COUNTRIES.length} countries · 2025
        </div>
      </div>

      <div style={{ padding: "6px 14px 4px" }}>
        <input
          type="text"
          placeholder="Search name, region, capital..."
          value={search}
          onChange={function(e) {
            setSearch(e.target.value);
          }}
          style={{
            width: "100%",
            padding: "5px 9px",
            border: "1px solid rgba(50,100,180,0.12)",
            background: "rgba(10,18,34,0.7)",
            color: "#b8c8dd",
            borderRadius: 5,
            fontSize: 11,
            outline: "none",
            boxSizing: "border-box",
          }}
        />
      </div>

      <div
        style={{
          padding: "3px 14px 5px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <button
          onClick={function() {
            setAutoR(!autoR);
          }}
          style={{
            padding: "2px 7px",
            border: "1px solid rgba(50,100,180,0.12)",
            background: autoR ? "rgba(58,128,224,0.08)" : "transparent",
            color: autoR ? "#4d9ae8" : "#4a6a88",
            borderRadius: 4,
            cursor: "pointer",
            fontSize: 9,
            fontWeight: 600,
          }}
        >
          {autoR ? "Rotating" : "Paused"}
        </button>
        <span style={{ fontSize: 9, color: "#354a60" }}>{sorted.length} entries</span>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "0 6px 6px" }}>
        {(function() {
          var countryRank = 0;
          var subRank = 0;
          var countyRank = 0;
          return sorted.map(function(item) {
            var d = item.entry;
            var depth = item.depth;

            if (depth === 0) {
              countryRank++;
              subRank = 0;
              countyRank = 0;
            } else if (depth === 1) {
              subRank++;
              countyRank = 0;
            } else {
              countyRank++;
            }

            var pct = (d.p / MP) * 100;
            var isSel = sel && sel.n === d.n && sel.t === d.t;
            var rgb = pClr(d.p);
            var clr = "rgb(" + rgb[0] + "," + rgb[1] + "," + rgb[2] + ")";
            var isSub = depth === 1;
            var isCounty = depth === 2;
            var rCol = d.rg ? RC[d.rg] : null;
            var hasSubs = !isSub && !isCounty && d.subdivisions && d.subdivisions.length > 0;
            var isExp = !isSub && !isCounty && d.iso && expanded[d.iso];
            var parentCountry = isSub && d.parentIso ? ISO_MAP[d.parentIso] : null;
            var hasCounties = isSub && d.parentIso === "USA" && d.fp && COUNTY_FILE_MAP[d.fp];
            var isStateExp = hasCounties && expandedStates[d.fp];
            var isCountyLoading = hasCounties && countyLoading[d.fp];
            var ml = isCounty ? 48 : isSub ? 24 : 0;
            var rank = isCounty ? countyRank : isSub ? subRank : countryRank;

            return (
              <div
                key={(d.parentFp || d.parentIso || "") + d.n + d.t + (d.fips || "")}
                onClick={function() {
                  setSel(d);
                }}
                style={{
                  padding: isCounty ? "2px 7px" : "4px 7px",
                  margin: "1px 0",
                  borderRadius: 4,
                  cursor: "pointer",
                  background: isSel ? "rgba(58,128,224,0.08)" : "transparent",
                  border: isSel ? "1px solid rgba(58,128,224,0.2)" : "1px solid transparent",
                  marginLeft: ml,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 1,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 4, minWidth: 0 }}>
                    {hasSubs && (
                      <span
                        onClick={function(e) {
                          e.stopPropagation();
                          toggleExpand(d.iso);
                        }}
                        style={{
                          fontSize: 9,
                          color: "#4a6a88",
                          cursor: "pointer",
                          width: 12,
                          textAlign: "center",
                          flexShrink: 0,
                          userSelect: "none",
                          transition: "transform 0.15s",
                          transform: isExp ? "rotate(90deg)" : "rotate(0deg)",
                          display: "inline-block",
                        }}
                      >
                        &#9654;
                      </span>
                    )}
                    {hasCounties && (
                      <span
                        onClick={function(e) {
                          e.stopPropagation();
                          toggleExpandState(d.fp);
                        }}
                        style={{
                          fontSize: 8,
                          color: isCountyLoading ? "#4d9ae8" : "#4a6a88",
                          cursor: "pointer",
                          width: 12,
                          textAlign: "center",
                          flexShrink: 0,
                          userSelect: "none",
                          transition: "transform 0.15s",
                          transform: isStateExp ? "rotate(90deg)" : "rotate(0deg)",
                          display: "inline-block",
                        }}
                      >
                        {isCountyLoading ? "\u25CB" : "\u25B6"}
                      </span>
                    )}
                    {!hasSubs && !isSub && !isCounty && <span style={{ width: 12, flexShrink: 0 }} />}
                    {isSub && !hasCounties && <span style={{ width: 12, flexShrink: 0 }} />}
                    <span
                      style={{
                        fontSize: 9,
                        color: "#354a60",
                        width: 20,
                        textAlign: "right",
                        fontWeight: 700,
                        flexShrink: 0,
                      }}
                    >
                      {rank}
                    </span>
                    <div
                      style={{
                        width: isCounty ? 4 : 6,
                        height: isCounty ? 4 : 6,
                        borderRadius: 2,
                        background: clr,
                        flexShrink: 0,
                      }}
                    />
                    <span
                      style={{
                        fontSize: isCounty ? 10 : 11,
                        fontWeight: 600,
                        color: isSel ? "#4d9ae8" : isCounty ? "#8a9ab0" : "#a8b8cc",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {d.n}
                    </span>
                    {isSub && parentCountry && (
                      <span
                        style={{
                          fontSize: 7,
                          color: "#5ea8f0",
                          background: "rgba(94,168,240,0.1)",
                          padding: "0 3px",
                          borderRadius: 2,
                          flexShrink: 0,
                        }}
                      >
                        {parentCountry.iso}
                      </span>
                    )}
                    {isSub && rCol && (
                      <span
                        style={{
                          fontSize: 7,
                          color: rCol,
                          background: rCol + "15",
                          padding: "0 3px",
                          borderRadius: 2,
                          flexShrink: 0,
                        }}
                      >
                        {d.rg.slice(0, 2)}
                      </span>
                    )}
                    {isCounty && (
                      <span
                        style={{
                          fontSize: 7,
                          color: "#6a7a8a",
                          background: "rgba(106,122,138,0.1)",
                          padding: "0 3px",
                          borderRadius: 2,
                          flexShrink: 0,
                        }}
                      >
                        CTY
                      </span>
                    )}
                  </div>
                  <span
                    style={{
                      fontSize: isCounty ? 10 : 11,
                      fontWeight: 700,
                      color: "#4d9ae8",
                      flexShrink: 0,
                      marginLeft: 4,
                    }}
                  >
                    {fmt(d.p)}
                  </span>
                </div>
                <div
                  style={{
                    height: 2,
                    background: "rgba(40,60,100,0.12)",
                    borderRadius: 2,
                    marginLeft: isCounty ? 24 : hasSubs || (!isSub && !isCounty) ? 42 : 30,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: pct + "%",
                      height: "100%",
                      borderRadius: 2,
                      background: clr,
                      opacity: 0.6,
                    }}
                  />
                </div>
              </div>
            );
          });
        })()}
      </div>

      {sel && (
        <div
          style={{
            borderTop: "1px solid rgba(50,100,180,0.1)",
            background: "rgba(6,14,28,0.85)",
            maxHeight: isSt || isCty ? 280 : 130,
            overflowY: "auto",
            padding: "8px 14px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 2 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: "#dce6f2" }}>{sel.n}</span>
            <span
              style={{
                fontSize: 7,
                fontWeight: 700,
                padding: "1px 5px",
                borderRadius: 3,
                color: isCity ? "#f2d59a" : isCty ? "#aaddff" : isSt ? "#5ea8f0" : "#7ec87e",
                background: isCity
                  ? "rgba(242,213,154,0.12)"
                  : isCty
                    ? "rgba(170,221,255,0.12)"
                    : isSt
                      ? "rgba(94,168,240,0.12)"
                      : "rgba(126,200,126,0.12)",
              }}
            >
              {isCity
                ? "CITY"
                : isCty
                  ? "COUNTY"
                  : isSt
                    ? selParent
                      ? selParent.subdivisionLabel.toUpperCase()
                      : "STATE"
                    : "COUNTRY"}
            </span>
            {(isSt || isCty) && (
              <span
                style={{
                  fontSize: 8,
                  fontWeight: 600,
                  color: tier(sel.p).c,
                  background: tier(sel.p).c + "18",
                  padding: "1px 5px",
                  borderRadius: 3,
                }}
              >
                {tier(sel.p).l}
              </span>
            )}
            {isCty && selParentState && (
              <span
                style={{
                  fontSize: 7,
                  color: "#5ea8f0",
                  background: "rgba(94,168,240,0.1)",
                  padding: "1px 4px",
                  borderRadius: 2,
                }}
              >
                {selParentState.n}
              </span>
            )}
          </div>
          <div style={{ fontSize: 20, fontWeight: 300, color: "#4d9ae8" }}>{sel.p.toLocaleString()}</div>
          <div style={{ fontSize: 10, color: "#4a6a88", marginBottom: 4 }}>
            {isCity
              ? (sel.p / WORLD_POP * 100).toFixed(4) + "% of world"
              : isCty && selParentState
                ? (sel.p / selParentState.p * 100).toFixed(2) +
                  "% of " +
                  selParentState.n +
                  " · " +
                  (sel.p / WORLD_POP * 100).toFixed(4) +
                  "% of world"
                : isSt && selParent
                  ? (sel.p / selParent.p * 100).toFixed(2) +
                    "% of " +
                    selParent.n +
                    " · " +
                    (sel.p / WORLD_POP * 100).toFixed(2) +
                    "% of world"
                  : (sel.p / WORLD_POP * 100).toFixed(2) + "% of world"}
          </div>

          {(isSt || isCty) && (
            <div>
              <div style={{ height: 1, background: "rgba(50,100,180,0.1)", margin: "4px 0 6px" }} />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2px 12px", fontSize: 10 }}>
                {sel.rg != null && (
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#4a6a88" }}>Region</span>
                    <span style={{ fontWeight: 600, color: RC[sel.rg] || "#b0c4da" }}>{sel.rg}</span>
                  </div>
                )}
                {sel.cp != null && (
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#4a6a88" }}>{isCty ? "Seat" : "Capital"}</span>
                    <span style={{ fontWeight: 600, color: "#b0c4da" }}>{sel.cp || "N/A"}</span>
                  </div>
                )}
                {sel.dn != null && (
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#4a6a88" }}>Density</span>
                    <span style={{ fontWeight: 600, color: "#b0c4da" }}>{sel.dn.toLocaleString()}/mi²</span>
                  </div>
                )}
                {sel.ar != null && (
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#4a6a88" }}>Area</span>
                    <span style={{ fontWeight: 600, color: "#b0c4da" }}>{sel.ar.toLocaleString()} km²</span>
                  </div>
                )}
                {sel.ag != null && (
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#4a6a88" }}>Med. Age</span>
                    <span style={{ fontWeight: 600, color: "#b0c4da" }}>{sel.ag}</span>
                  </div>
                )}
                {sel.fips != null && (
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#4a6a88" }}>FIPS</span>
                    <span style={{ fontWeight: 600, color: "#b0c4da" }}>{sel.fips}</span>
                  </div>
                )}
                {sel.ch != null && (
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#4a6a88" }}>2020-24</span>
                    <span style={{ fontWeight: 600, color: sel.ch >= 0 ? "#27ae60" : "#e74c3c" }}>
                      {sel.ch >= 0 ? "+" : ""}
                      {sel.ch}%
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {!isSt && !isCty && (
            <div>
              <div style={{ fontSize: 9, color: "#354a60" }}>
                {Number(sel.la).toFixed(2)}° · {Number(sel.lo).toFixed(2)}°
              </div>
              {sel.subdivisions && sel.subdivisions.length > 0 && (
                <div style={{ fontSize: 10, color: "#4a6a88", marginTop: 4 }}>
                  {sel.subdivisions.length} {sel.subdivisionLabel}
                  {sel.subdivisions.length !== 1 ? "s" : ""}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div
        style={{
          padding: "6px 14px",
          borderTop: "1px solid rgba(50,100,180,0.05)",
          display: "flex",
          alignItems: "center",
          gap: 4,
          fontSize: 8,
          color: "#354a60",
        }}
      >
        <span>Low</span>
        <div
          style={{
            flex: 1,
            height: 3,
            borderRadius: 2,
            background: "linear-gradient(90deg,#193e6e,#127d7d,#23a54b,#c3c32d,#e18718,#d72626)",
          }}
        />
        <span>High</span>
      </div>
    </div>
  );
}
