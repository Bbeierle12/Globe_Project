import { useCallback, useState } from "react";
import CesiumGlobe from "./CesiumGlobe.jsx";
import Sidebar from "./components/Sidebar.jsx";
import Tooltip from "./components/Tooltip.jsx";
import { COUNTY_FILE_MAP } from "./data/us-counties/index.js";

function App() {
  var [hov, setHov] = useState(null);
  var [sel, setSel] = useState(null);
  var [search, setSearch] = useState("");
  var [autoR, setAutoR] = useState(true);
  var [expanded, setExpanded] = useState({});
  var [expandedStates, setExpandedStates] = useState({});
  var [countyLoading, setCountyLoading] = useState({});
  var [loadedCounties, setLoadedCounties] = useState({});

  var toggleExpand = useCallback(function(iso) {
    setExpanded(function(prev) {
      var next = {};
      for (var k in prev) next[k] = prev[k];
      next[iso] = !next[iso];
      return next;
    });
  }, []);

  var toggleExpandState = useCallback(
    function(fp) {
      var willExpand = !expandedStates[fp];
      setExpandedStates(function(prev) {
        var next = {};
        for (var k in prev) next[k] = prev[k];
        next[fp] = !next[fp];
        return next;
      });

      if (!willExpand || loadedCounties[fp] || countyLoading[fp]) return;
      var loader = COUNTY_FILE_MAP[fp];
      if (!loader) return;

      setCountyLoading(function(prev) {
        var next = {};
        for (var k in prev) next[k] = prev[k];
        next[fp] = true;
        return next;
      });

      loader()
        .then(function(mod) {
          var varName = "COUNTIES_" + fp;
          var counties = mod[varName] || [];
          setLoadedCounties(function(prev) {
            var next = {};
            for (var k in prev) next[k] = prev[k];
            next[fp] = counties;
            return next;
          });
        })
        .catch(function(error) {
          console.error("Failed to load counties for state " + fp + ":", error);
        })
        .finally(function() {
          setCountyLoading(function(prev) {
            var next = {};
            for (var k in prev) next[k] = prev[k];
            delete next[fp];
            return next;
          });
        });
    },
    [expandedStates, loadedCounties, countyLoading],
  );

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        background: "#050810",
        display: "flex",
        fontFamily: "'Segoe UI',system-ui,sans-serif",
        color: "#b8c8dd",
        overflow: "hidden",
        position: "relative",
      }}
    >
      <CesiumGlobe
        onHover={setHov}
        onSelect={setSel}
        selection={sel}
        expanded={expanded}
        expandedStates={expandedStates}
        loadedCounties={loadedCounties}
        autoRotate={autoR}
      />
      <Tooltip hov={hov} />
      <Sidebar
        search={search}
        setSearch={setSearch}
        autoR={autoR}
        setAutoR={setAutoR}
        sel={sel}
        setSel={setSel}
        expanded={expanded}
        toggleExpand={toggleExpand}
        expandedStates={expandedStates}
        toggleExpandState={toggleExpandState}
        countyLoading={countyLoading}
        loadedCounties={loadedCounties}
      />
    </div>
  );
}

export default App;
