import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Cesium
vi.mock("cesium", function () {
  function FakeDataSource(name) {
    this.name = name;
    this.show = true;
    this.entities = {
      _items: [],
      add: function (e) { this._items.push(e); return e; },
      removeAll: function () { this._items = []; },
      values: [],
    };
  }
  function FakeProvider() {}
  function FakeImageryLayer() { this.show = true; this.alpha = 1; }

  return {
    CustomDataSource: FakeDataSource,
    Cartesian3: { fromDegrees: function (lo, la) { return { lo: lo, la: la }; } },
    Color: {
      fromCssColorString: function () {
        return { withAlpha: function () { return "color"; } };
      },
    },
    HeightReference: { CLAMP_TO_GROUND: 0 },
    NearFarScalar: function () {},
    UrlTemplateImageryProvider: FakeProvider,
    Credit: function (text) { this.text = text; },
    ImageryLayer: FakeImageryLayer,
  };
});

// Mock store
vi.mock("../../src/store/useAppStore.js", function () {
  return {
    useAppStore: {
      getState: function () {
        return { apiKeys: { googleMaps: "test-gm-key", cesiumIon: "" } };
      },
    },
  };
});

import { getAqiCategory } from "../../src/cesium/airQualityLayer.js";
import { getPollenCategory } from "../../src/cesium/pollenLayer.js";
import { getWeatherColor, getTempColor } from "../../src/cesium/weatherLayer.js";
import { getSolarCategory } from "../../src/cesium/solarLayer.js";

describe("getAqiCategory", function () {
  it("returns good for AQI <= 50", function () {
    expect(getAqiCategory(30)).toBe("good");
    expect(getAqiCategory(50)).toBe("good");
  });
  it("returns moderate for AQI 51-100", function () {
    expect(getAqiCategory(75)).toBe("moderate");
  });
  it("returns sensitive for AQI 101-150", function () {
    expect(getAqiCategory(120)).toBe("sensitive");
  });
  it("returns unhealthy for AQI 151-200", function () {
    expect(getAqiCategory(180)).toBe("unhealthy");
  });
  it("returns veryUnhealthy for AQI 201-300", function () {
    expect(getAqiCategory(250)).toBe("veryUnhealthy");
  });
  it("returns hazardous for AQI > 300", function () {
    expect(getAqiCategory(400)).toBe("hazardous");
  });
});

describe("getPollenCategory", function () {
  it("returns none for index 0", function () {
    expect(getPollenCategory(0)).toBe("none");
  });
  it("returns veryLow for index 1", function () {
    expect(getPollenCategory(1)).toBe("veryLow");
  });
  it("returns low for index 2", function () {
    expect(getPollenCategory(2)).toBe("low");
  });
  it("returns moderate for index 3", function () {
    expect(getPollenCategory(3)).toBe("moderate");
  });
  it("returns high for index 4", function () {
    expect(getPollenCategory(4)).toBe("high");
  });
  it("returns veryHigh for index > 4", function () {
    expect(getPollenCategory(5)).toBe("veryHigh");
  });
});

describe("getWeatherColor", function () {
  it("returns storm color for thunderstorm", function () {
    expect(getWeatherColor({ description: "Thunderstorm" })).toBe("#ff4444");
  });
  it("returns rain color for rain", function () {
    expect(getWeatherColor({ description: "Light rain" })).toBe("#4a90d9");
  });
  it("returns snow color for snow", function () {
    expect(getWeatherColor({ description: "Heavy snow" })).toBe("#e0e8ff");
  });
  it("returns cloudy for overcast", function () {
    expect(getWeatherColor({ description: "Overcast" })).toBe("#a0a0a0");
  });
  it("returns clear for sunny", function () {
    expect(getWeatherColor({ description: "Sunny" })).toBe("#ffd700");
  });
  it("returns clear for null condition", function () {
    expect(getWeatherColor(null)).toBe("#ffd700");
  });
});

describe("getTempColor", function () {
  it("returns cold for sub-zero", function () {
    expect(getTempColor(-5)).toBe("#00bfff");
  });
  it("returns hot for 35C", function () {
    expect(getTempColor(35)).toBe("#ff6600");
  });
  it("returns clear for warm temps", function () {
    expect(getTempColor(25)).toBe("#ffd700");
  });
});

describe("getSolarCategory", function () {
  it("returns poor for low kWh", function () {
    expect(getSolarCategory(500)).toBe("poor");
  });
  it("returns low for 800-1200", function () {
    expect(getSolarCategory(1000)).toBe("low");
  });
  it("returns moderate for 1200-1400", function () {
    expect(getSolarCategory(1300)).toBe("moderate");
  });
  it("returns good for 1400-1600", function () {
    expect(getSolarCategory(1500)).toBe("good");
  });
  it("returns excellent for > 1600", function () {
    expect(getSolarCategory(2000)).toBe("excellent");
  });
});

describe("airQualityLayer creation", function () {
  var mockViewer;

  beforeEach(function () {
    mockViewer = {
      dataSources: { add: vi.fn(), remove: vi.fn() },
      imageryLayers: {
        addImageryProvider: vi.fn(function () { return { show: true, alpha: 1 }; }),
        remove: vi.fn(),
      },
    };
  });

  it("creates layer with heatmap and data source", async function () {
    var { createAirQualityLayer } = await import("../../src/cesium/airQualityLayer.js");
    var layer = await createAirQualityLayer(mockViewer);
    expect(layer).not.toBeNull();
    expect(layer.destroy).toBeTypeOf("function");
    expect(layer.lookupLocation).toBeTypeOf("function");
    expect(layer.setMapType).toBeTypeOf("function");
    expect(layer.setVisible).toBeTypeOf("function");
    expect(mockViewer.imageryLayers.addImageryProvider).toHaveBeenCalled();
    expect(mockViewer.dataSources.add).toHaveBeenCalled();
  });

  it("lookupLocation adds entity on success", async function () {
    var { createAirQualityLayer } = await import("../../src/cesium/airQualityLayer.js");
    var mockFetch = vi.fn(function () {
      return Promise.resolve({
        ok: true,
        json: function () {
          return Promise.resolve({
            indexes: [{ aqi: 42, category: "Good", dominantPollutant: "pm25" }],
          });
        },
      });
    });
    var layer = await createAirQualityLayer(mockViewer, { fetchFn: mockFetch });
    var data = await layer.lookupLocation(40.7, -74.0);
    expect(data.indexes[0].aqi).toBe(42);
    expect(layer.dataSource.entities._items.length).toBe(1);
  });
});

describe("weatherLayer creation", function () {
  var mockViewer;

  beforeEach(function () {
    mockViewer = {
      dataSources: { add: vi.fn(), remove: vi.fn() },
    };
  });

  it("creates layer with data source", async function () {
    var { createWeatherLayer } = await import("../../src/cesium/weatherLayer.js");
    var layer = await createWeatherLayer(mockViewer);
    expect(layer).not.toBeNull();
    expect(layer.destroy).toBeTypeOf("function");
    expect(layer.lookupLocation).toBeTypeOf("function");
    expect(layer.lookupAlerts).toBeTypeOf("function");
    expect(layer.lookupForecast).toBeTypeOf("function");
    expect(layer.clearMarkers).toBeTypeOf("function");
  });
});

describe("solarLayer creation", function () {
  var mockViewer;

  beforeEach(function () {
    mockViewer = {
      dataSources: { add: vi.fn(), remove: vi.fn() },
    };
  });

  it("creates layer with data source", async function () {
    var { createSolarLayer } = await import("../../src/cesium/solarLayer.js");
    var layer = await createSolarLayer(mockViewer);
    expect(layer).not.toBeNull();
    expect(layer.destroy).toBeTypeOf("function");
    expect(layer.lookupLocation).toBeTypeOf("function");
    expect(layer.clearMarkers).toBeTypeOf("function");
  });
});
