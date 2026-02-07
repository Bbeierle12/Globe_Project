import { MP } from "../data/index.js";

function pClr(pop) {
  var t = Math.pow(pop / MP, 0.3);
  var s = [
    [25, 60, 110],
    [18, 125, 125],
    [35, 165, 75],
    [195, 195, 45],
    [225, 135, 28],
    [215, 38, 38],
  ];
  var idx = t * (s.length - 1);
  var lo = Math.floor(idx);
  var hi = Math.min(lo + 1, s.length - 1);
  var f = idx - lo;
  return [
    Math.round(s[lo][0] + (s[hi][0] - s[lo][0]) * f),
    Math.round(s[lo][1] + (s[hi][1] - s[lo][1]) * f),
    Math.round(s[lo][2] + (s[hi][2] - s[lo][2]) * f),
  ];
}

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
      var x = 0;
      var y = 0;
      for (var k = 0; k < arc.length; k++) {
        x += arc[k][0];
        y += arc[k][1];
        coords.push([x * tr.scale[0] + tr.translate[0], y * tr.scale[1] + tr.translate[1]]);
      }
    } else {
      for (var j = 0; j < arc.length; j++) coords.push([arc[j][0], arc[j][1]]);
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
    if (!geom || !geom.type) return null;
    if (geom.type === "Polygon") {
      return { type: "Polygon", coordinates: geom.arcs.map(decodeRing) };
    }
    if (geom.type === "MultiPolygon") {
      return {
        type: "MultiPolygon",
        coordinates: geom.arcs.map(function(poly) {
          return poly.map(decodeRing);
        }),
      };
    }
    if (geom.type === "GeometryCollection") {
      var geoms = (geom.geometries || []).map(decodeGeometry).filter(Boolean);
      if (geoms.length === 0) return null;
      return { type: "GeometryCollection", geometries: geoms };
    }
    return null;
  }

  var features = (obj.geometries || [])
    .map(function(g) {
      var geometry = decodeGeometry(g);
      if (!geometry) return null;
      return {
        type: "Feature",
        id: g.id,
        properties: g.properties || {},
        geometry: geometry,
      };
    })
    .filter(Boolean);

  return { type: "FeatureCollection", features: features };
}

export { decodeTopo, pClr };
