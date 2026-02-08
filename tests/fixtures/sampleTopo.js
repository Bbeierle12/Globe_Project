export var SIMPLE_TOPO = {
  type: "Topology",
  transform: { scale: [0.01, 0.01], translate: [-180, -90] },
  arcs: [
    [[0, 0], [100, 0], [0, 100], [-100, 0], [0, -100]]
  ],
  objects: {
    countries: {
      type: "GeometryCollection",
      geometries: [
        {
          type: "Polygon",
          id: "840",
          properties: { name: "Test Country" },
          arcs: [[0]],
        },
      ],
    },
  },
};

export var NO_TRANSFORM_TOPO = {
  type: "Topology",
  arcs: [
    [[-180, -90], [-80, -90], [-80, 0], [-180, 0], [-180, -90]]
  ],
  objects: {
    countries: {
      type: "GeometryCollection",
      geometries: [
        {
          type: "Polygon",
          id: "076",
          properties: {},
          arcs: [[0]],
        },
      ],
    },
  },
};

export var MULTI_POLYGON_TOPO = {
  type: "Topology",
  arcs: [
    [[0, 0], [1, 0], [0, 1], [-1, 0], [0, -1]],
    [[5, 5], [1, 0], [0, 1], [-1, 0], [0, -1]],
  ],
  objects: {
    countries: {
      type: "GeometryCollection",
      geometries: [
        {
          type: "MultiPolygon",
          id: "360",
          properties: {},
          arcs: [[[0]], [[1]]],
        },
      ],
    },
  },
};

export var EMPTY_TOPO = {
  type: "Topology",
  arcs: [],
  objects: {},
};

export var GEOMETRY_COLLECTION_TOPO = {
  type: "Topology",
  arcs: [
    [[0, 0], [1, 0], [0, 1], [-1, 0], [0, -1]]
  ],
  objects: {
    countries: {
      type: "GeometryCollection",
      geometries: [
        {
          type: "GeometryCollection",
          id: "999",
          properties: { name: "GeoCollection" },
          geometries: [
            { type: "Polygon", arcs: [[0]] },
          ],
        },
      ],
    },
  },
};
