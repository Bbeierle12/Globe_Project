var SOLAR_CONFIG = {
  baseUrl: "https://solar.googleapis.com/v1",
  buildingInsightsUrl: "https://solar.googleapis.com/v1/buildingInsights:findClosest",
  dataLayersUrl: "https://solar.googleapis.com/v1/dataLayers:get",
  qualityLevels: { LOW: "LOW", MEDIUM: "MEDIUM", HIGH: "HIGH" },
  defaultQuality: "MEDIUM",
  colors: {
    excellent: "#00e400",
    good: "#96d62b",
    moderate: "#ffff00",
    low: "#ff7e00",
    poor: "#ff0000",
  },
  solarThresholds: { poor: 800, low: 1200, moderate: 1400, good: 1600 },
  markerSizes: { poor: 6, low: 8, moderate: 10, good: 12, excellent: 14 },
};

export { SOLAR_CONFIG };
