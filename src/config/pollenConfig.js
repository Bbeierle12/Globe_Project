var POLLEN_CONFIG = {
  baseUrl: "https://pollen.googleapis.com/v1",
  tileUrl: "https://pollen.googleapis.com/v1/mapTypes/{mapType}/heatmapTiles/{z}/{x}/{y}",
  forecastUrl: "https://pollen.googleapis.com/v1/forecast:lookup",
  mapTypes: {
    TREE_UPI: "TREE_UPI",
    GRASS_UPI: "GRASS_UPI",
    WEED_UPI: "WEED_UPI",
  },
  defaultMapType: "TREE_UPI",
  refreshIntervalMs: 3600000,
  colors: {
    none: "#00e400",
    veryLow: "#96d62b",
    low: "#ffff00",
    moderate: "#ff7e00",
    high: "#ff0000",
    veryHigh: "#8f3f97",
  },
  indexThresholds: { veryLow: 1, low: 2, moderate: 3, high: 4 },
  markerSizes: { none: 5, veryLow: 6, low: 8, moderate: 10, high: 13, veryHigh: 16 },
};

export { POLLEN_CONFIG };
