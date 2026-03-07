var WEATHER_CONFIG = {
  baseUrl: "https://weather.googleapis.com/v1",
  currentUrl: "https://weather.googleapis.com/v1/currentConditions:lookup",
  hourlyUrl: "https://weather.googleapis.com/v1/forecast/hours:lookup",
  dailyUrl: "https://weather.googleapis.com/v1/forecast/days:lookup",
  alertsUrl: "https://weather.googleapis.com/v1/publicAlerts:lookup",
  refreshIntervalMs: 600000,
  colors: {
    clear: "#ffd700",
    cloudy: "#a0a0a0",
    rain: "#4a90d9",
    snow: "#e0e8ff",
    storm: "#ff4444",
    fog: "#c0c0c0",
    hot: "#ff6600",
    cold: "#00bfff",
  },
  tempThresholds: { cold: 0, cool: 10, mild: 20, warm: 30 },
  markerSizes: { default: 10, alert: 14 },
};

export { WEATHER_CONFIG };
