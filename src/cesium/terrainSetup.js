import * as Cesium from "cesium";

var WORLD_TERRAIN_ASSET_ID = 1;

function configureIonToken() {
  var token = import.meta.env.VITE_CESIUM_ION_TOKEN || "";
  if (token) Cesium.Ion.defaultAccessToken = token;
  return token;
}

async function createTerrainProvider() {
  try {
    return await Cesium.CesiumTerrainProvider.fromIonAssetId(WORLD_TERRAIN_ASSET_ID, {
      requestVertexNormals: true,
      requestWaterMask: true,
    });
  } catch (err) {
    console.warn("Falling back to ellipsoid terrain:", err);
    return new Cesium.EllipsoidTerrainProvider();
  }
}

function applyTerrainVisualSettings(viewer) {
  viewer.scene.globe.enableLighting = true;
  viewer.scene.globe.showGroundAtmosphere = true;
  viewer.scene.globe.depthTestAgainstTerrain = true;
  viewer.scene.globe.showWaterEffect = true;
  viewer.scene.globe.dynamicAtmosphereLighting = true;
  viewer.scene.globe.dynamicAtmosphereLightingFromSun = true;
  viewer.scene.globe.oceanNormalMapUrl = Cesium.buildModuleUrl("Assets/Textures/waterNormalsSmall.jpg");
}

export { applyTerrainVisualSettings, configureIonToken, createTerrainProvider };
