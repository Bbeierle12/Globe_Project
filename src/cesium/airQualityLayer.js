import * as Cesium from "cesium";
import { AIR_QUALITY_CONFIG } from "../config/airQualityConfig.js";
import { getGoogleApiKey } from "./googleTilesLayer.js";

function getAqiCategory(aqi) {
  var t = AIR_QUALITY_CONFIG.aqiThresholds;
  if (aqi <= t.good) return "good";
  if (aqi <= t.moderate) return "moderate";
  if (aqi <= t.sensitive) return "sensitive";
  if (aqi <= t.unhealthy) return "unhealthy";
  if (aqi <= t.veryUnhealthy) return "veryUnhealthy";
  return "hazardous";
}

function buildTileUrl(mapType, key) {
  return AIR_QUALITY_CONFIG.tileUrl
    .replace("{mapType}", mapType) + "?key=" + encodeURIComponent(key);
}

function createHeatmapProvider(mapType, key) {
  var templateUrl = buildTileUrl(mapType, key);
  return new Cesium.UrlTemplateImageryProvider({
    url: templateUrl.replace("{z}", "{z}").replace("{x}", "{x}").replace("{y}", "{y}"),
    minimumLevel: 0,
    maximumLevel: 16,
    credit: new Cesium.Credit("Google Air Quality"),
  });
}

async function fetchConditions(lat, lng, key, fetchFn) {
  var fn = fetchFn || fetch;
  var res = await fn(AIR_QUALITY_CONFIG.conditionsUrl + "?key=" + encodeURIComponent(key), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      location: { latitude: lat, longitude: lng },
      extraComputations: ["DOMINANT_POLLUTANT_CONCENTRATION", "POLLUTANT_ADDITIONAL_INFO"],
    }),
  });
  if (!res.ok) throw new Error("Air Quality API HTTP " + res.status);
  return res.json();
}

async function createAirQualityLayer(viewer, options) {
  var fetchFn = (options && options.fetchFn) || fetch;
  var mapType = (options && options.mapType) || AIR_QUALITY_CONFIG.defaultMapType;
  var key = getGoogleApiKey();
  if (!key) {
    console.warn("Air Quality layer: no Google Maps API key");
    return null;
  }

  var imageryLayer = null;
  var dataSource = new Cesium.CustomDataSource("airQuality");

  // Add heatmap tile overlay
  var provider = createHeatmapProvider(mapType, key);
  imageryLayer = viewer.imageryLayers.addImageryProvider(provider);
  imageryLayer.alpha = 0.55;

  viewer.dataSources.add(dataSource);

  async function lookupLocation(lat, lng) {
    var data = await fetchConditions(lat, lng, key, fetchFn);
    var indexes = data.indexes || [];
    var primary = indexes[0] || {};
    var aqi = primary.aqi || 0;
    var category = getAqiCategory(aqi);

    dataSource.entities.add({
      position: Cesium.Cartesian3.fromDegrees(lng, lat, 0),
      point: {
        pixelSize: AIR_QUALITY_CONFIG.markerSizes[category],
        color: Cesium.Color.fromCssColorString(AIR_QUALITY_CONFIG.colors[category]).withAlpha(0.85),
        outlineColor: Cesium.Color.fromCssColorString("#ffffff").withAlpha(0.5),
        outlineWidth: 1,
        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
        disableDepthTestDistance: 15000000,
        scaleByDistance: new Cesium.NearFarScalar(50000, 1.2, 16000000, 0.3),
      },
      description: "AQI: " + aqi + " (" + (primary.category || category) + ")" +
        (primary.dominantPollutant ? "<br>Dominant: " + primary.dominantPollutant : ""),
    });
    return data;
  }

  function setMapType(newType) {
    if (imageryLayer) {
      viewer.imageryLayers.remove(imageryLayer, true);
    }
    var newProvider = createHeatmapProvider(newType, key);
    imageryLayer = viewer.imageryLayers.addImageryProvider(newProvider);
    imageryLayer.alpha = 0.55;
  }

  function destroy() {
    if (imageryLayer) {
      viewer.imageryLayers.remove(imageryLayer, true);
      imageryLayer = null;
    }
    viewer.dataSources.remove(dataSource, true);
  }

  return {
    destroy: destroy,
    dataSource: dataSource,
    imageryLayer: imageryLayer,
    lookupLocation: lookupLocation,
    setMapType: setMapType,
    setVisible: function (visible) {
      dataSource.show = visible;
      if (imageryLayer) imageryLayer.show = visible;
    },
  };
}

export { createAirQualityLayer, getAqiCategory };
