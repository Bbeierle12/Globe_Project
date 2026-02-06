import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import * as THREE from "three";
import * as d3 from "d3";
import { COUNTRIES, ID_MAP, ISO_MAP, MP, WORLD_POP, RC, SUB_CONFIGS, findCountry } from "./data/index.js";

var R = 1.8;
var EARTH_TEX = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

var SUB_MAPS = {};
SUB_CONFIGS.forEach(function(cfg) {
  var country = ISO_MAP[cfg.iso];
  if (!country || !country.subdivisions.length) return;
  var map = {};
  country.subdivisions.forEach(function(s) {
    var code = s[cfg.codeField];
    if (code) map[code] = s;
  });
  SUB_MAPS[cfg.iso] = map;
});

var SKIP_NAMES = {};
SUB_CONFIGS.forEach(function(cfg) { if (cfg.skipName) SKIP_NAMES[cfg.skipName] = true; });

function fmt(n) {
  if (n >= 1e9) return (n / 1e9).toFixed(2) + "B";
  if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(1) + "K";
  return String(n);
}

function pClr(pop) {
  var t = Math.pow(pop / MP, 0.3);
  var s = [[25,60,110],[18,125,125],[35,165,75],[195,195,45],[225,135,28],[215,38,38]];
  var idx = t * (s.length - 1), lo = Math.floor(idx), hi = Math.min(lo + 1, s.length - 1), f = idx - lo;
  return [
    Math.round(s[lo][0] + (s[hi][0] - s[lo][0]) * f),
    Math.round(s[lo][1] + (s[hi][1] - s[lo][1]) * f),
    Math.round(s[lo][2] + (s[hi][2] - s[lo][2]) * f)
  ];
}

function ll2v(lat, lng, r) {
  var phi = (90 - lat) * Math.PI / 180;
  var theta = (lng + 180) * Math.PI / 180;
  return new THREE.Vector3(-r * Math.sin(phi) * Math.cos(theta), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(theta));
}

function tier(p) {
  if (p >= 2e7) return { l: "Mega", c: "#e74c3c" };
  if (p >= 1e7) return { l: "Large", c: "#e67e22" };
  if (p >= 5e6) return { l: "Medium", c: "#b7950b" };
  if (p >= 1e6) return { l: "Small", c: "#16a085" };
  return { l: "Micro", c: "#2980b9" };
}

/* Simple topojson decoder - no library needed */
function decodeTopo(topo, objectName) {
  var obj = topo.objects[objectName];
  if (!obj) return { type: "FeatureCollection", features: [] };
  var tr = topo.transform;

  function decodeArc(arcIdx) {
    var reversed = arcIdx < 0;
    var idx = reversed ? ~arcIdx : arcIdx;
    var arc = topo.arcs[idx];
    var coords = [];
    if (tr) {
      var x = 0, y = 0;
      for (var k = 0; k < arc.length; k++) {
        x += arc[k][0];
        y += arc[k][1];
        coords.push([x * tr.scale[0] + tr.translate[0], y * tr.scale[1] + tr.translate[1]]);
      }
    } else {
      for (var k = 0; k < arc.length; k++) {
        coords.push([arc[k][0], arc[k][1]]);
      }
    }
    if (reversed) coords.reverse();
    return coords;
  }

  function decodeRing(arcs) {
    var coords = [];
    for (var i = 0; i < arcs.length; i++) {
      var decoded = decodeArc(arcs[i]);
      if (coords.length > 0) decoded = decoded.slice(1);
      coords = coords.concat(decoded);
    }
    return coords;
  }

  function decodeGeometry(geom) {
    if (geom.type === "Polygon") {
      return { type: "Polygon", coordinates: geom.arcs.map(decodeRing) };
    }
    if (geom.type === "MultiPolygon") {
      return {
        type: "MultiPolygon",
        coordinates: geom.arcs.map(function(poly) { return poly.map(decodeRing); })
      };
    }
    return geom;
  }

  var features = (obj.geometries || []).map(function(g) {
    return {
      type: "Feature",
      properties: g.properties || {},
      id: g.id,
      geometry: decodeGeometry(g)
    };
  });

  return { type: "FeatureCollection", features: features };
}

function findHighlightFeatures(sel, geo) {
  if (!sel) return [];
  if (sel.t === "c") {
    return geo.world.features.filter(function(f) {
      var name = ID_MAP[String(f.id)];
      if (!name || !sel.al) return false;
      var nl = name.toLowerCase();
      return sel.al.some(function(a) { return a.toLowerCase() === nl; });
    });
  }
  var cfg = null;
  for (var i = 0; i < SUB_CONFIGS.length; i++) {
    if (SUB_CONFIGS[i].iso === sel.parentIso) { cfg = SUB_CONFIGS[i]; break; }
  }
  if (!cfg || !geo.subs[cfg.iso]) return [];
  var selCode = sel[cfg.codeField];
  if (!selCode) return [];
  return geo.subs[cfg.iso].features.filter(function(f) {
    if (cfg.skipFeature && cfg.skipFeature(f)) return false;
    return cfg.extractCode(f) === selCode;
  });
}

export default function Globe() {
  var mountRef = useRef(null);
  var hovRef = useRef(null);
  var arRef = useRef(true);
  var mkRef = useRef({ m: [], dm: new Map(), subMarkers: new Map() });
  var visibleMkRef = useRef([]);
  var hlRef = useRef(null);
  var geoRef = useRef(null);
  var selRef = useRef(null);

  var [hov, setHov] = useState(null);
  var [sel, setSel] = useState(null);
  var [search, setSearch] = useState("");
  var [loading, setLoading] = useState(true);
  var [autoR, setAutoR] = useState(true);
  var [err, setErr] = useState(null);
  var [expanded, setExpanded] = useState({});

  var toggleExpand = useCallback(function(iso) {
    setExpanded(function(prev) { var n = {}; for (var k in prev) n[k] = prev[k]; n[iso] = !n[iso]; return n; });
  }, []);

  // Hierarchical sorted list
  var sorted = useMemo(function() {
    var countries = COUNTRIES.slice();
    var q = search ? search.toLowerCase() : "";

    function matchEntry(d) {
      return d.n.toLowerCase().indexOf(q) >= 0 ||
        (d.rg && d.rg.toLowerCase().indexOf(q) >= 0) ||
        (d.cp && d.cp.toLowerCase().indexOf(q) >= 0) ||
        (d.al && d.al.some(function(a) { return a.toLowerCase().indexOf(q) >= 0; }));
    }

    function hasSubMatch(c) {
      if (!c.subdivisions || c.subdivisions.length === 0) return false;
      return c.subdivisions.some(function(s) { return matchEntry(s); });
    }

    if (q) {
      countries = countries.filter(function(c) {
        return matchEntry(c) || hasSubMatch(c);
      });
    }

    countries.sort(function(a, b) { return b.p - a.p; });

    var list = [];
    countries.forEach(function(c) {
      list.push({ entry: c, depth: 0 });
      var showSubs = expanded[c.iso] || (q && hasSubMatch(c));
      if (showSubs && c.subdivisions && c.subdivisions.length > 0) {
        var subs = c.subdivisions.slice().sort(function(a, b) { return b.p - a.p; });
        if (q) {
          subs = subs.filter(function(s) { return matchEntry(s); });
        }
        subs.forEach(function(s) {
          list.push({ entry: s, depth: 1 });
        });
      }
    });
    return list;
  }, [search, expanded]);

  // Toggle subdivision marker visibility when expanded changes
  useEffect(function() {
    if (!mkRef.current.subMarkers || mkRef.current.subMarkers.size === 0) return;
    COUNTRIES.forEach(function(c) {
      var markers = mkRef.current.subMarkers.get(c.iso);
      if (!markers) return;
      markers.forEach(function(mk) { mk.visible = !!expanded[c.iso]; });
    });
    // Rebuild visible markers list for raycaster
    var all = mkRef.current.m.slice();
    COUNTRIES.forEach(function(c) {
      if (expanded[c.iso]) {
        var subs = mkRef.current.subMarkers.get(c.iso);
        if (subs) all = all.concat(subs);
      }
    });
    visibleMkRef.current = all;
  }, [expanded]);

  useEffect(function() { hovRef.current = hov; }, [hov]);
  useEffect(function() { arRef.current = autoR; }, [autoR]);
  useEffect(function() { selRef.current = sel; }, [sel]);

  useEffect(function() {
    var hl = hlRef.current;
    var geo = geoRef.current;
    if (!hl || !geo) return;
    hl.ctx.clearRect(0, 0, hl.cv.width, hl.cv.height);
    if (!sel) {
      hl.tex.needsUpdate = true;
      return;
    }
    var features = findHighlightFeatures(sel, geo);
    if (features.length > 0) {
      hl.ctx.save();
      hl.ctx.shadowColor = "#4d9ae8";
      hl.ctx.shadowBlur = 20;
      hl.ctx.strokeStyle = "rgba(77,154,232,0.9)";
      hl.ctx.lineWidth = 3;
      for (var pass = 0; pass < 2; pass++) {
        features.forEach(function(f) {
          hl.ctx.beginPath();
          hl.pathGen(f);
          hl.ctx.stroke();
        });
      }
      hl.ctx.restore();
    }
    hl.tex.needsUpdate = true;
  }, [sel]);

  useEffect(function() {
    var el = mountRef.current;
    if (!el) return;
    var dead = false;
    var af = null;

    try {
      var w = el.clientWidth || 800;
      var h = el.clientHeight || 600;
      var scene = new THREE.Scene();
      scene.background = new THREE.Color(0x050810);

      var cam = new THREE.PerspectiveCamera(50, w / h, 0.1, 1000);
      cam.position.set(0, 1, 4.6);
      cam.lookAt(new THREE.Vector3(0, 0, 0));

      var ren = new THREE.WebGLRenderer({ antialias: true, alpha: false });
      ren.setSize(w, h);
      ren.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      el.appendChild(ren.domElement);

      scene.add(new THREE.AmbientLight(0x8899bb, 1.8));
      var dl1 = new THREE.DirectionalLight(0xffeedd, 1.2);
      dl1.position.set(5, 3, 5);
      scene.add(dl1);
      var dl2 = new THREE.DirectionalLight(0x5577aa, 0.4);
      dl2.position.set(-4, -2, -3);
      scene.add(dl2);

      var gg = new THREE.Group();
      scene.add(gg);

      // Atmosphere glow
      gg.add(new THREE.Mesh(
        new THREE.SphereGeometry(R + 0.14, 48, 48),
        new THREE.MeshBasicMaterial({ color: 0x1a3a6a, transparent: true, opacity: 0.055, side: THREE.BackSide })
      ));

      // Stars
      var sp = new Float32Array(3000);
      for (var i = 0; i < 3000; i++) sp[i] = (Math.random() - 0.5) * 80;
      var sg = new THREE.BufferGeometry();
      sg.setAttribute("position", new THREE.BufferAttribute(sp, 3));
      scene.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 0.04, transparent: true, opacity: 0.4 })));

      // Placeholder sphere while loading
      var placeholderMat = new THREE.MeshPhongMaterial({ color: 0x0c1e38, shininess: 5 });
      var earthMesh = new THREE.Mesh(new THREE.SphereGeometry(R, 96, 64), placeholderMat);
      gg.add(earthMesh);

      // Interaction state
      var rc = new THREE.Raycaster();
      var mVec = new THREE.Vector2();
      var isDrag = false, moved = false;
      var prev = { x: 0, y: 0 }, rv = { x: 0, y: 0 };

      function onMM(e) {
        var rect = el.getBoundingClientRect();
        mVec.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mVec.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        if (isDrag) {
          moved = true;
          rv.x = (e.clientX - prev.x) * 0.005;
          rv.y = (e.clientY - prev.y) * 0.005;
          gg.rotation.y += rv.x;
          gg.rotation.x = Math.max(-1.2, Math.min(1.2, gg.rotation.x + rv.y));
          prev = { x: e.clientX, y: e.clientY };
          return;
        }
        rc.setFromCamera(mVec, cam);
        var hits = rc.intersectObjects(visibleMkRef.current);
        if (hits.length > 0) {
          var dd = mkRef.current.dm.get(hits[0].object.id);
          if (dd) { setHov(dd); el.style.cursor = "pointer"; return; }
        }
        setHov(null);
        el.style.cursor = "grab";
      }
      function onMD(e) { isDrag = true; moved = false; prev = { x: e.clientX, y: e.clientY }; el.style.cursor = "grabbing"; }
      function onMU() { isDrag = false; el.style.cursor = "grab"; }
      function onCl() { if (moved) return; if (hovRef.current) setSel(hovRef.current); else setSel(null); }
      function onWh(e) { e.preventDefault(); cam.position.z = Math.max(2.4, Math.min(10, cam.position.z + e.deltaY * 0.004)); }

      el.addEventListener("mousemove", onMM);
      el.addEventListener("mousedown", onMD);
      el.addEventListener("mouseup", onMU);
      el.addEventListener("click", onCl);
      el.addEventListener("wheel", onWh, { passive: false });

      // Animation loop (starts immediately with placeholder)
      function loop() {
        af = requestAnimationFrame(loop);
        if (arRef.current && !isDrag) gg.rotation.y += 0.0012;
        if (!isDrag) {
          rv.x *= 0.94; rv.y *= 0.94;
          if (Math.abs(rv.x) > 0.0001) gg.rotation.y += rv.x;
          if (Math.abs(rv.y) > 0.0001) gg.rotation.x = Math.max(-1.2, Math.min(1.2, gg.rotation.x + rv.y));
        }
        ren.render(scene, cam);
      }
      loop();

      function onRs() {
        var ww = el.clientWidth || 800;
        var hh = el.clientHeight || 600;
        cam.aspect = ww / hh;
        cam.updateProjectionMatrix();
        ren.setSize(ww, hh);
      }
      window.addEventListener("resize", onRs);

      // Now fetch the topo data
      var fetches = [fetch(EARTH_TEX).then(function(r) { return r.json(); })];
      SUB_CONFIGS.forEach(function(cfg) {
        fetches.push(fetch(cfg.url).then(function(r) { return r.json(); }));
      });

      Promise.all(fetches).then(function(results) {
        if (dead) return;
        var worldGeo = decodeTopo(results[0], "countries");
        var subGeos = {};
        SUB_CONFIGS.forEach(function(cfg, i) {
          subGeos[cfg.iso] = decodeTopo(results[i + 1], cfg.objectName);
        });

        // Paint the texture
        var cw = 4096, ch = 2048;
        var cv = document.createElement("canvas");
        cv.width = cw;
        cv.height = ch;
        var ctx = cv.getContext("2d");

        var proj = d3.geoEquirectangular().fitSize([cw, ch], { type: "Sphere" });
        var pathGen = d3.geoPath(proj, ctx);

        // Ocean
        var gradient = ctx.createLinearGradient(0, 0, 0, ch);
        gradient.addColorStop(0, "#0a1628");
        gradient.addColorStop(0.5, "#0c1e38");
        gradient.addColorStop(1, "#0a1628");
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, cw, ch);

        // Fill countries (skip those with subdivision configs)
        worldGeo.features.forEach(function(f) {
          if (!f.geometry) return;
          var name = ID_MAP[String(f.id)];
          if (SKIP_NAMES[name]) return;
          ctx.beginPath();
          pathGen(f);
          var cd = findCountry(f.id);
          if (cd) {
            var rgb = pClr(cd.p);
            ctx.fillStyle = "rgb(" + rgb[0] + "," + rgb[1] + "," + rgb[2] + ")";
          } else {
            ctx.fillStyle = "#162640";
          }
          ctx.fill();
        });

        // Fill subdivisions for all configured countries
        SUB_CONFIGS.forEach(function(cfg) {
          var geo = subGeos[cfg.iso];
          if (!geo) return;
          var map = SUB_MAPS[cfg.iso] || {};
          geo.features.forEach(function(f) {
            if (!f.geometry) return;
            if (cfg.skipFeature && cfg.skipFeature(f)) return;
            var code = cfg.extractCode(f);
            var sub = code ? map[code] : null;
            ctx.beginPath();
            pathGen(f);
            if (sub) {
              var rgb = pClr(sub.p);
              ctx.fillStyle = "rgb(" + rgb[0] + "," + rgb[1] + "," + rgb[2] + ")";
            } else {
              ctx.fillStyle = "#1a3050";
            }
            ctx.fill();
          });
        });

        // Country borders
        ctx.strokeStyle = "rgba(140,190,255,0.22)";
        ctx.lineWidth = 1;
        worldGeo.features.forEach(function(f) {
          if (!f.geometry) return;
          ctx.beginPath();
          pathGen(f);
          ctx.stroke();
        });

        // Subdivision borders for all configured countries
        ctx.strokeStyle = "rgba(200,230,255,0.5)";
        ctx.lineWidth = 1;
        SUB_CONFIGS.forEach(function(cfg) {
          var geo = subGeos[cfg.iso];
          if (!geo) return;
          geo.features.forEach(function(f) {
            if (!f.geometry) return;
            if (cfg.skipFeature && cfg.skipFeature(f)) return;
            ctx.beginPath();
            pathGen(f);
            ctx.stroke();
          });
        });

        // Graticule
        ctx.beginPath();
        pathGen(d3.geoGraticule10());
        ctx.strokeStyle = "rgba(80,130,200,0.06)";
        ctx.lineWidth = 0.5;
        ctx.stroke();

        // Apply texture
        var tex = new THREE.CanvasTexture(cv);
        tex.needsUpdate = true;
        earthMesh.material = new THREE.MeshPhongMaterial({ map: tex, shininess: 12 });
        earthMesh.material.needsUpdate = true;

        // Highlight overlay sphere
        var hlCv = document.createElement("canvas");
        hlCv.width = cw;
        hlCv.height = ch;
        var hlCtx = hlCv.getContext("2d");
        var hlTex = new THREE.CanvasTexture(hlCv);
        hlTex.needsUpdate = true;
        var hlPathGen = d3.geoPath(proj, hlCtx);
        var hlMesh = new THREE.Mesh(
          new THREE.SphereGeometry(R + 0.002, 96, 64),
          new THREE.MeshBasicMaterial({ map: hlTex, transparent: true, depthWrite: false })
        );
        gg.add(hlMesh);
        hlRef.current = { cv: hlCv, ctx: hlCtx, tex: hlTex, pathGen: hlPathGen };
        geoRef.current = { world: worldGeo, subs: subGeos };

        // Draw initial highlight if something is already selected
        var curSel = selRef.current;
        if (curSel) {
          var features = findHighlightFeatures(curSel, geoRef.current);
          if (features.length > 0) {
            hlCtx.save();
            hlCtx.shadowColor = "#4d9ae8";
            hlCtx.shadowBlur = 20;
            hlCtx.strokeStyle = "rgba(77,154,232,0.9)";
            hlCtx.lineWidth = 3;
            for (var pass = 0; pass < 2; pass++) {
              features.forEach(function(f) {
                hlCtx.beginPath();
                hlPathGen(f);
                hlCtx.stroke();
              });
            }
            hlCtx.restore();
            hlTex.needsUpdate = true;
          }
        }

        // Create country markers (always visible)
        var countryMarkers = [];
        var dataMap = new Map();
        var subMarkers = new Map();

        COUNTRIES.forEach(function(c) {
          var sz = 0.012 + Math.pow(c.p / MP, 0.4) * 0.024;
          var mGeo = new THREE.CircleGeometry(sz, 12);
          var mMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55, side: THREE.DoubleSide });
          var mk = new THREE.Mesh(mGeo, mMat);
          var pos = ll2v(c.la, c.lo, R + 0.005);
          mk.position.copy(pos);
          mk.lookAt(new THREE.Vector3(pos.x * 2, pos.y * 2, pos.z * 2));
          gg.add(mk);
          countryMarkers.push(mk);
          dataMap.set(mk.id, c);

          // Create subdivision markers (initially hidden)
          if (c.subdivisions && c.subdivisions.length > 0) {
            var subs = [];
            c.subdivisions.forEach(function(s) {
              var ssz = 0.008 + Math.pow(s.p / MP, 0.4) * 0.018;
              var sGeo = new THREE.CircleGeometry(ssz, 10);
              var sMat = new THREE.MeshBasicMaterial({ color: 0x88ccff, transparent: true, opacity: 0.55, side: THREE.DoubleSide });
              var smk = new THREE.Mesh(sGeo, sMat);
              var spos = ll2v(s.la, s.lo, R + 0.005);
              smk.position.copy(spos);
              smk.lookAt(new THREE.Vector3(spos.x * 2, spos.y * 2, spos.z * 2));
              smk.visible = false;
              gg.add(smk);
              subs.push(smk);
              dataMap.set(smk.id, s);
            });
            subMarkers.set(c.iso, subs);
          }
        });

        mkRef.current = { m: countryMarkers, dm: dataMap, subMarkers: subMarkers };
        visibleMkRef.current = countryMarkers.slice();
        setLoading(false);
      }).catch(function(error) {
        console.error("Failed to load map data:", error);
        setErr("Map data failed to load");
        setLoading(false);
      });

      return function() {
        dead = true;
        if (af) cancelAnimationFrame(af);
        window.removeEventListener("resize", onRs);
        el.removeEventListener("mousemove", onMM);
        el.removeEventListener("mousedown", onMD);
        el.removeEventListener("mouseup", onMU);
        el.removeEventListener("click", onCl);
        el.removeEventListener("wheel", onWh);
        ren.dispose();
        if (el.contains(ren.domElement)) el.removeChild(ren.domElement);
      };
    } catch (e) {
      console.error("Globe init error:", e);
      setErr(String(e));
      setLoading(false);
    }
  }, []);

  var isSt = sel && sel.t === "s";
  var selParent = isSt && sel.parentIso ? ISO_MAP[sel.parentIso] : null;

  return (
    <div style={{ width: "100vw", height: "100vh", background: "#050810", display: "flex", fontFamily: "'Segoe UI',system-ui,sans-serif", color: "#b8c8dd", overflow: "hidden", position: "relative" }}>
      <div ref={mountRef} style={{ flex: 1, cursor: "grab", position: "relative" }}>
        {loading && (
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(5,8,16,0.7)", zIndex: 20 }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ width: 32, height: 32, border: "3px solid rgba(60,120,220,0.15)", borderTopColor: "#3a80e0", borderRadius: "50%", animation: "globespin 0.8s linear infinite", margin: "0 auto 8px" }} />
              <div style={{ color: "#5a7ea0", fontSize: 12 }}>Loading boundaries...</div>
            </div>
          </div>
        )}
        {err && (
          <div style={{ position: "absolute", bottom: 10, left: 10, background: "rgba(200,50,50,0.8)", color: "white", padding: "4px 10px", borderRadius: 4, fontSize: 11, zIndex: 20 }}>{err}</div>
        )}
      </div>

      {hov && (
        <div style={{ position: "absolute", top: 12, left: "50%", transform: "translateX(-50%)", background: "rgba(6,12,24,0.92)", border: "1px solid rgba(60,130,240,0.2)", borderRadius: 8, padding: "6px 14px", zIndex: 10, textAlign: "center", pointerEvents: "none" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: "#dce6f2" }}>{hov.n}</span>
            <span style={{ fontSize: 7, fontWeight: 700, padding: "1px 5px", borderRadius: 3, color: hov.t === "s" ? "#5ea8f0" : "#7ec87e", background: hov.t === "s" ? "rgba(94,168,240,0.12)" : "rgba(126,200,126,0.12)" }}>
              {hov.t === "s" ? (hov.parentIso && ISO_MAP[hov.parentIso] ? ISO_MAP[hov.parentIso].subdivisionLabel.toUpperCase() : "STATE") : "COUNTRY"}
            </span>
          </div>
          <div style={{ fontSize: 18, fontWeight: 300, color: "#4d9ae8" }}>{hov.p.toLocaleString()}</div>
          {hov.rg && <div style={{ fontSize: 10, color: RC[hov.rg] }}>{hov.rg} {hov.cp ? " · " + hov.cp : ""}</div>}
        </div>
      )}

      <div style={{ width: 330, background: "rgba(6,10,20,0.94)", borderLeft: "1px solid rgba(50,100,180,0.08)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ padding: "12px 14px 8px", borderBottom: "1px solid rgba(50,100,180,0.06)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#3a80e0", boxShadow: "0 0 8px #3a80e0" }} />
            <span style={{ fontSize: 16, fontWeight: 700, color: "#dce6f2" }}>Population Globe</span>
          </div>
          <div style={{ fontSize: 10, color: "#4a6a88", marginLeft: 13, marginTop: 2 }}>{COUNTRIES.length} countries · 2025</div>
        </div>

        <div style={{ padding: "6px 14px 4px" }}>
          <input type="text" placeholder="Search name, region, capital..."
            value={search}
            onChange={function(e) { setSearch(e.target.value); }}
            style={{ width: "100%", padding: "5px 9px", border: "1px solid rgba(50,100,180,0.12)", background: "rgba(10,18,34,0.7)", color: "#b8c8dd", borderRadius: 5, fontSize: 11, outline: "none", boxSizing: "border-box" }} />
        </div>

        <div style={{ padding: "3px 14px 5px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <button onClick={function() { setAutoR(!autoR); }}
            style={{ padding: "2px 7px", border: "1px solid rgba(50,100,180,0.12)", background: autoR ? "rgba(58,128,224,0.08)" : "transparent", color: autoR ? "#4d9ae8" : "#4a6a88", borderRadius: 4, cursor: "pointer", fontSize: 9, fontWeight: 600 }}>
            {autoR ? "Rotating" : "Paused"}
          </button>
          <span style={{ fontSize: 9, color: "#354a60" }}>{sorted.length} entries</span>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "0 6px 6px" }}>
          {(function() {
            var countryRank = 0;
            var subRank = 0;
            return sorted.map(function(item, i) {
              var d = item.entry;
              var depth = item.depth;

              if (depth === 0) {
                countryRank++;
                subRank = 0;
              } else {
                subRank++;
              }

              var pct = (d.p / MP) * 100;
              var isSel = sel && sel.n === d.n && sel.t === d.t;
              var rgb = pClr(d.p);
              var clr = "rgb(" + rgb[0] + "," + rgb[1] + "," + rgb[2] + ")";
              var isSub = depth === 1;
              var rCol = d.rg ? RC[d.rg] : null;
              var hasSubs = !isSub && d.subdivisions && d.subdivisions.length > 0;
              var isExp = !isSub && d.iso && expanded[d.iso];
              var parentCountry = isSub && d.parentIso ? ISO_MAP[d.parentIso] : null;

              return (
                <div key={(d.parentIso || "") + d.n + d.t} onClick={function() { setSel(d); }}
                  style={{ padding: "4px 7px", margin: "1px 0", borderRadius: 4, cursor: "pointer", background: isSel ? "rgba(58,128,224,0.08)" : "transparent", border: isSel ? "1px solid rgba(58,128,224,0.2)" : "1px solid transparent", marginLeft: isSub ? 24 : 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 4, minWidth: 0 }}>
                      {hasSubs && (
                        <span onClick={function(e) { e.stopPropagation(); toggleExpand(d.iso); }}
                          style={{ fontSize: 9, color: "#4a6a88", cursor: "pointer", width: 12, textAlign: "center", flexShrink: 0, userSelect: "none", transition: "transform 0.15s", transform: isExp ? "rotate(90deg)" : "rotate(0deg)", display: "inline-block" }}>
                          &#9654;
                        </span>
                      )}
                      {!hasSubs && !isSub && <span style={{ width: 12, flexShrink: 0 }} />}
                      <span style={{ fontSize: 9, color: "#354a60", width: 20, textAlign: "right", fontWeight: 700, flexShrink: 0 }}>{isSub ? subRank : countryRank}</span>
                      <div style={{ width: 6, height: 6, borderRadius: 2, background: clr, flexShrink: 0 }} />
                      <span style={{ fontSize: 11, fontWeight: 600, color: isSel ? "#4d9ae8" : "#a8b8cc", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{d.n}</span>
                      {isSub && parentCountry && <span style={{ fontSize: 7, color: "#5ea8f0", background: "rgba(94,168,240,0.1)", padding: "0 3px", borderRadius: 2, flexShrink: 0 }}>{parentCountry.iso}</span>}
                      {isSub && rCol && <span style={{ fontSize: 7, color: rCol, background: rCol + "15", padding: "0 3px", borderRadius: 2, flexShrink: 0 }}>{d.rg.slice(0, 2)}</span>}
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#4d9ae8", flexShrink: 0, marginLeft: 4 }}>{fmt(d.p)}</span>
                  </div>
                  <div style={{ height: 2, background: "rgba(40,60,100,0.12)", borderRadius: 2, marginLeft: hasSubs || (!isSub) ? 42 : 30, overflow: "hidden" }}>
                    <div style={{ width: pct + "%", height: "100%", borderRadius: 2, background: clr, opacity: 0.6 }} />
                  </div>
                </div>
              );
            });
          })()}
        </div>

        {sel && (
          <div style={{ borderTop: "1px solid rgba(50,100,180,0.1)", background: "rgba(6,14,28,0.85)", maxHeight: isSt ? 280 : 130, overflowY: "auto", padding: "8px 14px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 2 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: "#dce6f2" }}>{sel.n}</span>
              <span style={{ fontSize: 7, fontWeight: 700, padding: "1px 5px", borderRadius: 3, color: isSt ? "#5ea8f0" : "#7ec87e", background: isSt ? "rgba(94,168,240,0.12)" : "rgba(126,200,126,0.12)" }}>
                {isSt ? (selParent ? selParent.subdivisionLabel.toUpperCase() : "STATE") : "COUNTRY"}
              </span>
              {isSt && <span style={{ fontSize: 8, fontWeight: 600, color: tier(sel.p).c, background: tier(sel.p).c + "18", padding: "1px 5px", borderRadius: 3 }}>{tier(sel.p).l}</span>}
            </div>
            <div style={{ fontSize: 20, fontWeight: 300, color: "#4d9ae8" }}>{sel.p.toLocaleString()}</div>
            <div style={{ fontSize: 10, color: "#4a6a88", marginBottom: 4 }}>
              {isSt && selParent
                ? (sel.p / selParent.p * 100).toFixed(2) + "% of " + selParent.n + " · " + (sel.p / WORLD_POP * 100).toFixed(2) + "% of world"
                : (sel.p / WORLD_POP * 100).toFixed(2) + "% of world"}
            </div>

            {isSt && (
              <div>
                <div style={{ height: 1, background: "rgba(50,100,180,0.1)", margin: "4px 0 6px" }} />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2px 12px", fontSize: 10 }}>
                  {sel.rg != null && <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "#4a6a88" }}>Region</span><span style={{ fontWeight: 600, color: RC[sel.rg] || "#b0c4da" }}>{sel.rg}</span></div>}
                  {sel.cp != null && <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "#4a6a88" }}>Capital</span><span style={{ fontWeight: 600, color: "#b0c4da" }}>{sel.cp}</span></div>}
                  {sel.dn != null && <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "#4a6a88" }}>Density</span><span style={{ fontWeight: 600, color: "#b0c4da" }}>{sel.dn.toLocaleString()}/mi²</span></div>}
                  {sel.ar != null && <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "#4a6a88" }}>Area</span><span style={{ fontWeight: 600, color: "#b0c4da" }}>{sel.ar.toLocaleString()} mi²</span></div>}
                  {sel.ag != null && <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "#4a6a88" }}>Med. Age</span><span style={{ fontWeight: 600, color: "#b0c4da" }}>{sel.ag}</span></div>}
                  {sel.ch != null && <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "#4a6a88" }}>2020-25</span><span style={{ fontWeight: 600, color: sel.ch >= 0 ? "#27ae60" : "#e74c3c" }}>{sel.ch >= 0 ? "+" : ""}{sel.ch}%</span></div>}
                </div>
                {sel.ch != null && (
                  <div style={{ marginTop: 6 }}>
                    <div style={{ fontSize: 9, color: "#4a6a88", marginBottom: 2 }}>Growth 2020-2025</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <div style={{ flex: 1, height: 5, background: "rgba(40,60,100,0.15)", borderRadius: 3, overflow: "hidden" }}>
                        <div style={{ width: (sel.ch >= 0 ? Math.min(sel.ch / 10.4 * 100, 100) : Math.min(Math.abs(sel.ch) / 1.5 * 100, 100)) + "%", height: "100%", borderRadius: 3, background: sel.ch >= 0 ? "#27ae60" : "#e74c3c" }} />
                      </div>
                      <span style={{ fontSize: 10, fontWeight: 700, color: sel.ch >= 0 ? "#27ae60" : "#e74c3c", minWidth: 32, textAlign: "right" }}>{sel.ch >= 0 ? "+" : ""}{sel.ch}%</span>
                    </div>
                  </div>
                )}
                {sel.dn != null && (
                  <div style={{ marginTop: 4 }}>
                    <div style={{ fontSize: 9, color: "#4a6a88", marginBottom: 2 }}>Density vs US Avg (94.0/mi²)</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <div style={{ flex: 1, height: 5, background: "rgba(40,60,100,0.15)", borderRadius: 3, overflow: "hidden" }}>
                        <div style={{ width: Math.min((sel.dn / 1263) * 100, 100) + "%", height: "100%", borderRadius: 3, background: "linear-gradient(90deg,#2471a3,#2e86c1)" }} />
                      </div>
                      <span style={{ fontSize: 10, fontWeight: 600, color: "#5ea8f0", minWidth: 45, textAlign: "right" }}>
                        {sel.dn >= 1000 ? (sel.dn / 1000).toFixed(1) + "K" : sel.dn.toFixed(0)}/mi²
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
            {!isSt && (
              <div>
                <div style={{ fontSize: 9, color: "#354a60" }}>{sel.la.toFixed(2)}° · {sel.lo.toFixed(2)}°</div>
                {sel.subdivisions && sel.subdivisions.length > 0 && (
                  <div style={{ fontSize: 10, color: "#4a6a88", marginTop: 4 }}>{sel.subdivisions.length} {sel.subdivisionLabel}{sel.subdivisions.length !== 1 ? "s" : ""}</div>
                )}
              </div>
            )}
          </div>
        )}

        <div style={{ padding: "6px 14px", borderTop: "1px solid rgba(50,100,180,0.05)", display: "flex", alignItems: "center", gap: 4, fontSize: 8, color: "#354a60" }}>
          <span>Low</span>
          <div style={{ flex: 1, height: 3, borderRadius: 2, background: "linear-gradient(90deg,#193e6e,#127d7d,#23a54b,#c3c32d,#e18718,#d72626)" }} />
          <span>High</span>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: "@keyframes globespin{to{transform:rotate(360deg)}}*::-webkit-scrollbar{width:4px}*::-webkit-scrollbar-track{background:transparent}*::-webkit-scrollbar-thumb{background:rgba(50,100,180,0.15);border-radius:2px}" }} />
    </div>
  );
}
