import * as Cesium from "cesium";
import { POLLEN_CONFIG } from "../config/pollenConfig.js";
import { getGoogleApiKey } from "./googleTilesLayer.js";

function getPollenCategory(index) {
  var t = POLLEN_CONFIG.indexThresholds;
  if (index < t.veryLow) return "none";
  if (index < t.low) return "veryLow";
  if (index < t.moderate) return "low";
  if (index < t.high) return "moderate";
  if (index <= 4) return "high";
  return "veryHigh";
}

function createHeatmapProvider(mapType, key) {
  var templateUrl = POLLEN_CONFIG.tileUrl
    .replace("{mapType}", mapType) + "?key=" + encodeURIComponent(key);
  return new Cesium.UrlTemplateImageryProvider({
    url: templateUrl.replace("{z}", "{z}").replace("{x}", "{x}").replace("{y}", "{y}"),
    minimumLevel: 0,
    maximumLevel: 16,
    credit: new Cesium.Credit("Google Pollen"),
  });
}

async function fetchForecast(lat, lng, key, fetchFn) {
  var fn = fetchFn || fetch;
  var res = await fn(POLLEN_CONFIG.forecastUrl + "?key=" + encodeURIComponent(key), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      location: { latitude: lat, longitude: lng },
      days: 1,
    }),
  });
  if (!res.ok) throw new Error("Pollen API HTTP " + res.status);
  return res.json();
}

async function createPollenLayer(viewer, options) {
  var fetchFn = (options && options.fetchFn) || fetch;
  var mapType = (options && options.mapType) || POLLEN_CONFIG.defaultMapType;
  var key = getGoogleApiKey();
  if (!key) {
    console.warn("Pollen layer: no Google Maps API key");
    return null;
  }

  var imageryLayer = null;
  var dataSource = new Cesium.CustomDataSource("pollen");

  var provider = createHeatmapProvider(mapType, key);
  imageryLayer = viewer.imageryLayers.addImageryProvider(provider);
  imageryLayer.alpha = 0.5;

  viewer.dataSources.add(dataSource);

  async function lookupLocation(lat, lng) {
    var data = await fetchForecast(lat, lng, key, fetchFn);
    var dailyInfo = (data.dailyInfo || [])[0] || {};
    var pollenTypes = dailyInfo.pollenTypeInfo || [];

    pollenTypes.forEach(function (pt) {
      var indexInfo = pt.indexInfo || {};
      var index = indexInfo.value || 0;
      var category = getPollenCategory(index);
      var label = (pt.displayName || pt.code || "Pollen") + ": " + (indexInfo.category || category);

      dataSource.entities.add({
        position: Cesium.Cartesian3.fromDegrees(lng, lat, 0),
        point: {
          pixelSize: POLLEN_CONFIG.markerSizes[category],
          color: Cesium.Color.fromCssColorString(POLLEN_CONFIG.colors[category]).withAlpha(0.8),
          outlineColor: Cesium.Color.fromCssColorString("#ffffff").withAlpha(0.5),
          outlineWidth: 1,
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
          disableDepthTestDistance: 15000000,
          scaleByDistance: new Cesium.NearFarScalar(50000, 1.2, 16000000, 0.3),
        },
        description: label + " (UPI: " + index + ")",
      });
    });
    return data;
  }

  function setMapType(newType) {
    if (imageryLayer) {
      viewer.imageryLayers.remove(imageryLayer, true);
    }
    var newProvider = createHeatmapProvider(newType, key);
    imageryLayer = viewer.imageryLayers.addImageryProvider(newProvider);
    imageryLayer.alpha = 0.5;
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

export { createPollenLayer, getPollenCategory };
