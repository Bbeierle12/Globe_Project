var AIR_QUALITY_CONFIG = {
  baseUrl: "https://airquality.googleapis.com/v1",
  tileUrl: "https://airquality.googleapis.com/v1/mapTypes/{mapType}/heatmapTiles/{z}/{x}/{y}",
  conditionsUrl: "https://airquality.googleapis.com/v1/currentConditions:lookup",
  mapTypes: {
    US_AQI: "US_AQI",
    UAQI: "UAQI",
  },
  defaultMapType: "UAQI",
  refreshIntervalMs: 600000,
  colors: {
    good: "#00e400",
    moderate: "#ffff00",
    sensitive: "#ff7e00",
    unhealthy: "#ff0000",
    veryUnhealthy: "#8f3f97",
    hazardous: "#7e0023",
  },
  aqiThresholds: { good: 50, moderate: 100, sensitive: 150, unhealthy: 200, veryUnhealthy: 300 },
  markerSizes: { good: 6, moderate: 8, sensitive: 10, unhealthy: 12, veryUnhealthy: 14, hazardous: 16 },
};

export { AIR_QUALITY_CONFIG };
