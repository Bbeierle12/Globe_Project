import * as Cesium from "cesium";
import { SOLAR_CONFIG } from "../config/solarConfig.js";
import { getGoogleApiKey } from "./googleTilesLayer.js";

function getSolarCategory(annualKwh) {
  var t = SOLAR_CONFIG.solarThresholds;
  if (annualKwh < t.poor) return "poor";
  if (annualKwh < t.low) return "low";
  if (annualKwh < t.moderate) return "moderate";
  if (annualKwh < t.good) return "good";
  return "excellent";
}

async function fetchBuildingInsights(lat, lng, key, quality, fetchFn) {
  var fn = fetchFn || fetch;
  var params = new URLSearchParams({
    key: key,
    "location.latitude": lat,
    "location.longitude": lng,
    requiredQuality: quality || SOLAR_CONFIG.defaultQuality,
  });
  var res = await fn(SOLAR_CONFIG.buildingInsightsUrl + "?" + params.toString());
  if (!res.ok) throw new Error("Solar API HTTP " + res.status);
  return res.json();
}

async function createSolarLayer(viewer, options) {
  var fetchFn = (options && options.fetchFn) || fetch;
  var key = getGoogleApiKey();
  if (!key) {
    console.warn("Solar layer: no Google Maps API key");
    return null;
  }

  var dataSource = new Cesium.CustomDataSource("solar");
  viewer.dataSources.add(dataSource);

  async function lookupLocation(lat, lng, quality) {
    var data = await fetchBuildingInsights(lat, lng, key, quality, fetchFn);
    var solar = data.solarPotential || {};
    var maxPanels = solar.maxArrayPanelsCount || 0;
    var maxArea = solar.maxArrayAreaMeters2 || 0;
    var yearlyKwh = solar.maxSunshineHoursPerYear || 0;
    var carbonOffset = solar.carbonOffsetFactorKgPerMwh || 0;
    var category = getSolarCategory(yearlyKwh);

    dataSource.entities.add({
      position: Cesium.Cartesian3.fromDegrees(lng, lat, 0),
      point: {
        pixelSize: SOLAR_CONFIG.markerSizes[category],
        color: Cesium.Color.fromCssColorString(SOLAR_CONFIG.colors[category]).withAlpha(0.85),
        outlineColor: Cesium.Color.fromCssColorString("#ffffff").withAlpha(0.5),
        outlineWidth: 1,
        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
        disableDepthTestDistance: 15000000,
        scaleByDistance: new Cesium.NearFarScalar(50000, 1.2, 16000000, 0.3),
      },
      description:
        "Solar Potential: " + category.charAt(0).toUpperCase() + category.slice(1) +
        "<br>Max panels: " + maxPanels +
        "<br>Roof area: " + maxArea.toFixed(1) + " m\u00B2" +
        "<br>Sunshine: " + yearlyKwh.toFixed(0) + " hrs/yr" +
        (carbonOffset ? "<br>CO\u2082 offset: " + carbonOffset + " kg/MWh" : ""),
    });

    return data;
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
    clearMarkers: clearMarkers,
    setVisible: function (visible) {
      dataSource.show = visible;
    },
  };
}

export { createSolarLayer, getSolarCategory };
