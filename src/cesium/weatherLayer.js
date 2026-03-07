import * as Cesium from "cesium";
import { WEATHER_CONFIG } from "../config/weatherConfig.js";
import { getGoogleApiKey } from "./googleTilesLayer.js";

function getWeatherColor(condition) {
  if (!condition) return WEATHER_CONFIG.colors.clear;
  var desc = (condition.description || condition.type || "").toLowerCase();
  if (desc.includes("storm") || desc.includes("thunder")) return WEATHER_CONFIG.colors.storm;
  if (desc.includes("snow") || desc.includes("ice") || desc.includes("sleet")) return WEATHER_CONFIG.colors.snow;
  if (desc.includes("rain") || desc.includes("drizzle") || desc.includes("shower")) return WEATHER_CONFIG.colors.rain;
  if (desc.includes("fog") || desc.includes("mist") || desc.includes("haze")) return WEATHER_CONFIG.colors.fog;
  if (desc.includes("cloud") || desc.includes("overcast")) return WEATHER_CONFIG.colors.cloudy;
  return WEATHER_CONFIG.colors.clear;
}

function getTempColor(tempC) {
  var t = WEATHER_CONFIG.tempThresholds;
  if (tempC < t.cold) return WEATHER_CONFIG.colors.cold;
  if (tempC < t.cool) return WEATHER_CONFIG.colors.cold;
  if (tempC < t.mild) return WEATHER_CONFIG.colors.cloudy;
  if (tempC < t.warm) return WEATHER_CONFIG.colors.clear;
  return WEATHER_CONFIG.colors.hot;
}

async function fetchCurrentConditions(lat, lng, key, fetchFn) {
  var fn = fetchFn || fetch;
  var url = WEATHER_CONFIG.currentUrl + "?key=" + encodeURIComponent(key);
  var res = await fn(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      location: { latitude: lat, longitude: lng },
    }),
  });
  if (!res.ok) throw new Error("Weather API HTTP " + res.status);
  return res.json();
}

async function fetchDailyForecast(lat, lng, key, fetchFn) {
  var fn = fetchFn || fetch;
  var url = WEATHER_CONFIG.dailyUrl + "?key=" + encodeURIComponent(key);
  var res = await fn(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      location: { latitude: lat, longitude: lng },
      days: 5,
    }),
  });
  if (!res.ok) throw new Error("Weather API HTTP " + res.status);
  return res.json();
}

async function fetchAlerts(lat, lng, key, fetchFn) {
  var fn = fetchFn || fetch;
  var url = WEATHER_CONFIG.alertsUrl + "?key=" + encodeURIComponent(key);
  var res = await fn(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      location: { latitude: lat, longitude: lng },
    }),
  });
  if (!res.ok) throw new Error("Weather Alerts API HTTP " + res.status);
  return res.json();
}

async function createWeatherLayer(viewer, options) {
  var fetchFn = (options && options.fetchFn) || fetch;
  var key = getGoogleApiKey();
  if (!key) {
    console.warn("Weather layer: no Google Maps API key");
    return null;
  }

  var dataSource = new Cesium.CustomDataSource("weather");
  viewer.dataSources.add(dataSource);

  async function lookupLocation(lat, lng) {
    var data = await fetchCurrentConditions(lat, lng, key, fetchFn);
    var current = data.currentConditions || data;
    var temp = current.temperature || {};
    var tempC = temp.degrees != null ? temp.degrees : null;
    var condition = current.condition || current.weatherCondition || {};
    var color = tempC != null ? getTempColor(tempC) : getWeatherColor(condition);

    var desc = (condition.description || condition.type || "Unknown");
    var tempStr = tempC != null ? tempC + "\u00B0C" : "N/A";

    dataSource.entities.add({
      position: Cesium.Cartesian3.fromDegrees(lng, lat, 0),
      point: {
        pixelSize: WEATHER_CONFIG.markerSizes.default,
        color: Cesium.Color.fromCssColorString(color).withAlpha(0.85),
        outlineColor: Cesium.Color.fromCssColorString("#ffffff").withAlpha(0.5),
        outlineWidth: 1,
        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
        disableDepthTestDistance: 15000000,
        scaleByDistance: new Cesium.NearFarScalar(50000, 1.2, 16000000, 0.3),
      },
      description: desc + " | " + tempStr +
        (current.humidity ? " | Humidity: " + current.humidity.percent + "%" : ""),
    });

    return data;
  }

  async function lookupAlerts(lat, lng) {
    var data = await fetchAlerts(lat, lng, key, fetchFn);
    var alerts = data.alerts || [];
    alerts.forEach(function (alert) {
      dataSource.entities.add({
        position: Cesium.Cartesian3.fromDegrees(lng, lat, 0),
        point: {
          pixelSize: WEATHER_CONFIG.markerSizes.alert,
          color: Cesium.Color.fromCssColorString(WEATHER_CONFIG.colors.storm).withAlpha(0.9),
          outlineColor: Cesium.Color.fromCssColorString("#ffffff").withAlpha(0.7),
          outlineWidth: 2,
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
          disableDepthTestDistance: 15000000,
          scaleByDistance: new Cesium.NearFarScalar(50000, 1.4, 16000000, 0.4),
        },
        description: (alert.event || "Weather Alert") + ": " + (alert.description || ""),
      });
    });
    return data;
  }

  async function lookupForecast(lat, lng) {
    return fetchDailyForecast(lat, lng, key, fetchFn);
  }

  function clearMarkers() {
    dataSource.entities.removeAll();
  }

  function destroy() {
    viewer.dataSources.remove(dataSource, true);
  }

  return {
    destroy: destroy,
    dataSource: dataSource,
    lookupLocation: lookupLocation,
    lookupAlerts: lookupAlerts,
    lookupForecast: lookupForecast,
    clearMarkers: clearMarkers,
    setVisible: function (visible) {
      dataSource.show = visible;
    },
  };
}

export { createWeatherLayer, getWeatherColor, getTempColor };
