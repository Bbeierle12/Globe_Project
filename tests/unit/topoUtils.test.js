import { pClr, decodeTopo } from "../../src/cesium/topoUtils.js";
import { MP } from "../../src/data/index.js";
import { SIMPLE_TOPO, NO_TRANSFORM_TOPO, MULTI_POLYGON_TOPO, EMPTY_TOPO, GEOMETRY_COLLECTION_TOPO } from "../fixtures/sampleTopo.js";

describe("pClr", function() {
  it("returns an RGB array of three integers", function() {
    var result = pClr(1000000);
    expect(result).toHaveLength(3);
    result.forEach(function(v) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(255);
      expect(Number.isInteger(v)).toBe(true);
    });
  });

  it("returns blue-ish for low population", function() {
    var rgb = pClr(1);
    expect(rgb[2]).toBeGreaterThan(rgb[0]);
  });

  it("returns red-ish for max population", function() {
    var rgb = pClr(MP);
    expect(rgb[0]).toBeGreaterThan(rgb[2]);
  });

  it("returns consistent results for same input", function() {
    expect(pClr(5000000)).toEqual(pClr(5000000));
  });

  it("produces higher red for high population than low population", function() {
    var lowRed = pClr(1)[0];
    var highRed = pClr(1000000000)[0];
    expect(highRed).toBeGreaterThan(lowRed);
  });

  it("handles zero population", function() {
    var rgb = pClr(0);
    expect(rgb).toHaveLength(3);
    rgb.forEach(function(v) {
      expect(Number.isFinite(v)).toBe(true);
    });
  });
});

describe("decodeTopo", function() {
  it("decodes simple Polygon with transform", function() {
    var result = decodeTopo(SIMPLE_TOPO, "countries");
    expect(result.type).toBe("FeatureCollection");
    expect(result.features).toHaveLength(1);
    var feature = result.features[0];
    expect(feature.type).toBe("Feature");
    expect(feature.id).toBe("840");
    expect(feature.geometry.type).toBe("Polygon");
    expect(feature.geometry.coordinates).toHaveLength(1);
    expect(feature.geometry.coordinates[0].length).toBeGreaterThan(2);
  });

  it("applies transform scale and translate correctly", function() {
    var result = decodeTopo(SIMPLE_TOPO, "countries");
    var coords = result.features[0].geometry.coordinates[0];
    // First point: x=0, y=0 -> 0*0.01 + (-180) = -180, 0*0.01 + (-90) = -90
    expect(coords[0][0]).toBeCloseTo(-180, 5);
    expect(coords[0][1]).toBeCloseTo(-90, 5);
  });

  it("decodes without transform", function() {
    var result = decodeTopo(NO_TRANSFORM_TOPO, "countries");
    expect(result.features).toHaveLength(1);
    var coords = result.features[0].geometry.coordinates[0];
    expect(coords[0]).toEqual([-180, -90]);
  });

  it("decodes MultiPolygon", function() {
    var result = decodeTopo(MULTI_POLYGON_TOPO, "countries");
    var geom = result.features[0].geometry;
    expect(geom.type).toBe("MultiPolygon");
    expect(geom.coordinates).toHaveLength(2);
  });

  it("returns empty FeatureCollection for missing object", function() {
    var result = decodeTopo(EMPTY_TOPO, "nonexistent");
    expect(result).toEqual({ type: "FeatureCollection", features: [] });
  });

  it("handles reversed arcs (negative index)", function() {
    var topo = {
      type: "Topology",
      arcs: [[[0, 0], [1, 0], [1, 1]]],
      objects: {
        test: {
          type: "GeometryCollection",
          geometries: [{
            type: "Polygon",
            id: "1",
            properties: {},
            arcs: [[-1]],
          }],
        },
      },
    };
    var result = decodeTopo(topo, "test");
    expect(result.features).toHaveLength(1);
    var coords = result.features[0].geometry.coordinates[0];
    expect(coords[0]).toEqual([1, 1]);
    expect(coords[coords.length - 1]).toEqual([0, 0]);
  });

  it("preserves feature properties", function() {
    var result = decodeTopo(SIMPLE_TOPO, "countries");
    expect(result.features[0].properties).toEqual({ name: "Test Country" });
  });

  it("filters out geometries with null type", function() {
    var topo = {
      type: "Topology",
      arcs: [],
      objects: {
        test: {
          type: "GeometryCollection",
          geometries: [{ type: null, arcs: [] }],
        },
      },
    };
    var result = decodeTopo(topo, "test");
    expect(result.features).toHaveLength(0);
  });

  it("handles GeometryCollection type", function() {
    var result = decodeTopo(GEOMETRY_COLLECTION_TOPO, "countries");
    expect(result.features).toHaveLength(1);
    var geom = result.features[0].geometry;
    expect(geom.type).toBe("GeometryCollection");
    expect(geom.geometries).toHaveLength(1);
    expect(geom.geometries[0].type).toBe("Polygon");
  });

  it("handles empty geometries array", function() {
    var topo = {
      type: "Topology",
      arcs: [],
      objects: {
        test: {
          type: "GeometryCollection",
          geometries: [],
        },
      },
    };
    var result = decodeTopo(topo, "test");
    expect(result.features).toHaveLength(0);
  });
});
