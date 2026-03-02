/**
 * Unit tests for cesium layer helpers that don't require a real Cesium viewer.
 * Covers: terrainSetup.js, googleTilesLayer.js, buildingsLayer.js
 */

vi.mock("cesium", function () {
  return {
    Ion: { defaultAccessToken: "" },
    buildModuleUrl: vi.fn(function (path) { return "/mock/" + path; }),
    CesiumTerrainProvider: { fromIonAssetId: vi.fn() },
    EllipsoidTerrainProvider: vi.fn(function () { return { type: "ellipsoid" }; }),
    Cesium3DTileset:  { fromIonAssetId: vi.fn() },
    Cesium3DTileStyle: vi.fn(function () { return {}; }),
    GoogleMaps: { defaultApiKey: "" },
    createGooglePhotorealistic3DTileset: vi.fn(),
  };
});

import * as Cesium from "cesium";
import { configureIonToken, applyTerrainVisualSettings, createTerrainProvider } from "../../src/cesium/terrainSetup.js";
import { getGoogleApiKey, createGoogleTilesLayer } from "../../src/cesium/googleTilesLayer.js";
import { createBuildingsLayer } from "../../src/cesium/buildingsLayer.js";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeGlobe() {
  return {
    enableLighting: false,
    showGroundAtmosphere: false,
    depthTestAgainstTerrain: false,
    showWaterEffect: false,
    dynamicAtmosphereLighting: false,
    dynamicAtmosphereLightingFromSun: false,
    oceanNormalMapUrl: "",
    tileCacheSize: 0,
  };
}

function makeMockViewer(extraScene) {
  return {
    scene: Object.assign({ globe: makeGlobe(), primitives: { add: vi.fn() } }, extraScene || {}),
    imageryLayers: { get: vi.fn(function () { return { show: true }; }) },
  };
}

// ─── terrainSetup ─────────────────────────────────────────────────────────────

describe("configureIonToken", function () {
  afterEach(function () { vi.unstubAllEnvs(); });

  it("returns empty string when token env var is absent", function () {
    vi.stubEnv("VITE_CESIUM_ION_TOKEN", "");
    expect(configureIonToken()).toBe("");
  });

  it("returns the token and sets Ion.defaultAccessToken", function () {
    vi.stubEnv("VITE_CESIUM_ION_TOKEN", "tok-xyz");
    var token = configureIonToken();
    expect(token).toBe("tok-xyz");
    expect(Cesium.Ion.defaultAccessToken).toBe("tok-xyz");
  });
});

describe("applyTerrainVisualSettings", function () {
  it("enables globe lighting", function () {
    var viewer = makeMockViewer();
    applyTerrainVisualSettings(viewer);
    expect(viewer.scene.globe.enableLighting).toBe(true);
  });

  it("sets depthTestAgainstTerrain", function () {
    var viewer = makeMockViewer();
    applyTerrainVisualSettings(viewer);
    expect(viewer.scene.globe.depthTestAgainstTerrain).toBe(true);
  });

  it("sets tileCacheSize to 500", function () {
    var viewer = makeMockViewer();
    applyTerrainVisualSettings(viewer);
    expect(viewer.scene.globe.tileCacheSize).toBe(500);
  });

  it("sets showWaterEffect", function () {
    var viewer = makeMockViewer();
    applyTerrainVisualSettings(viewer);
    expect(viewer.scene.globe.showWaterEffect).toBe(true);
  });
});

describe("createTerrainProvider", function () {
  it("falls back to EllipsoidTerrainProvider when Ion is unavailable", async function () {
    Cesium.CesiumTerrainProvider.fromIonAssetId.mockRejectedValue(new Error("Ion unavailable"));
    var provider = await createTerrainProvider();
    expect(provider).toBeDefined();
    expect(Cesium.EllipsoidTerrainProvider).toHaveBeenCalled();
  });

  it("returns the terrain provider on success", async function () {
    var fake = { type: "terrain" };
    Cesium.CesiumTerrainProvider.fromIonAssetId.mockResolvedValue(fake);
    var provider = await createTerrainProvider();
    expect(provider).toBe(fake);
  });
});

// ─── googleTilesLayer ─────────────────────────────────────────────────────────

describe("getGoogleApiKey", function () {
  afterEach(function () { vi.unstubAllEnvs(); });

  it("returns empty string when env var is absent", function () {
    vi.stubEnv("VITE_GOOGLE_MAPS_API_KEY", "");
    expect(getGoogleApiKey()).toBe("");
  });
});

describe("createGoogleTilesLayer", function () {
  afterEach(function () { vi.unstubAllEnvs(); });

  it("returns null when no API key is configured", async function () {
    vi.stubEnv("VITE_GOOGLE_MAPS_API_KEY", "");
    var result = await createGoogleTilesLayer(makeMockViewer());
    expect(result).toBeNull();
  });

  it("returns null when tileset creation throws", async function () {
    vi.stubEnv("VITE_GOOGLE_MAPS_API_KEY", "test-key");
    Cesium.createGooglePhotorealistic3DTileset.mockRejectedValue(new Error("unavailable"));
    var result = await createGoogleTilesLayer(makeMockViewer());
    expect(result).toBeNull();
  });
});

// ─── buildingsLayer ───────────────────────────────────────────────────────────

describe("createBuildingsLayer", function () {
  it("returns null when tileset creation throws", async function () {
    Cesium.Cesium3DTileset.fromIonAssetId.mockRejectedValue(new Error("Ion unavailable"));
    var viewer = makeMockViewer();
    var result = await createBuildingsLayer(viewer);
    expect(result).toBeNull();
  });

  it("adds tileset to scene primitives on success", async function () {
    var fakeTileset = { style: null };
    Cesium.Cesium3DTileset.fromIonAssetId.mockResolvedValue(fakeTileset);
    var viewer = makeMockViewer();
    var result = await createBuildingsLayer(viewer);
    expect(viewer.scene.primitives.add).toHaveBeenCalledWith(fakeTileset);
    expect(result).toBe(fakeTileset);
  });
});
