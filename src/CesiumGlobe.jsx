import { useEffect, useRef, useState } from "react";
import * as Cesium from "cesium";
import "cesium/Build/Cesium/Widgets/widgets.css";
import { COUNTRIES, MP } from "./data/index.js";
import { applyTerrainVisualSettings, configureIonToken, createTerrainProvider } from "./cesium/terrainSetup.js";
import { createPopulationLayer } from "./cesium/populationLayer.js";
import { createCityLayer } from "./cesium/cityLayer.js";
import { createBuildingsLayer } from "./cesium/buildingsLayer.js";
import { createEarthquakeLayer } from "./cesium/earthquakeLayer.js";
import { createGoogleTilesLayer } from "./cesium/googleTilesLayer.js";
import { createAirQualityLayer } from "./cesium/airQualityLayer.js";
import { createPollenLayer } from "./cesium/pollenLayer.js";
import { createWeatherLayer } from "./cesium/weatherLayer.js";
import { createSolarLayer } from "./cesium/solarLayer.js";
import { createLayerRegistry } from "./utils/layerRegistry.js";

function markerSize(pop, base, range) {
  return base + Math.pow(pop / MP, 0.4) * range;
}

function getEntryHeight(entry) {
  if (!entry) return 0;
  if (entry.t === "c") return 3000000;
  if (entry.t === "s") return 800000;
  if (entry.t === "county") return 200000;
  if (entry.t === "city") return 220000;
  return 1200000;
}

function getPickedEntry(pick) {
  if (!pick) return null;
  if (pick.id && pick.id.__entry) return pick.id.__entry;
  return null;
}

// --- Decomposed init helpers ---

function initViewer(mountEl, terrainProvider) {
  var viewer = new Cesium.Viewer(mountEl, {
    animation: false,
    timeline: false,
    baseLayerPicker: false,
    geocoder: false,
    homeButton: false,
    sceneModePicker: false,
    navigationHelpButton: false,
    infoBox: false,
    selectionIndicator: false,
    fullscreenButton: false,
    scene3DOnly: true,
    requestRenderMode: true,
    maximumRenderTimeChange: Infinity,
    contextOptions: {
      get webgl() {
        return {
          powerPreference: "high-performance",
          antialias: false,
          preserveDrawingBuffer: false,
        };
      },
    },
    terrainProvider: terrainProvider,
    baseLayer: new Cesium.ImageryLayer(
      new Cesium.OpenStreetMapImageryProvider({ url: "https://tile.openstreetmap.org/" }),
    ),
  });

  viewer.scene.backgroundColor = Cesium.Color.fromCssColorString("#050810");
  viewer.scene.skyAtmosphere.show = true;
  viewer.scene.globe.baseColor = Cesium.Color.fromCssColorString("#0a1628");
  viewer.cesiumWidget.screenSpaceEventHandler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK);

  applyTerrainVisualSettings(viewer);
  viewer.camera.setView({
    destination: Cesium.Cartesian3.fromDegrees(15, 22, 21000000),
  });

  return viewer;
}

function createMarkers(viewer) {
  var countryMarkers = [];
  var subMarkers = new Map();

  COUNTRIES.forEach(function(country) {
    var countryEntity = viewer.entities.add({
      position: Cesium.Cartesian3.fromDegrees(country.lo, country.la, 0),
      point: {
        pixelSize: markerSize(country.p, 6, 11),
        color: Cesium.Color.fromCssColorString("#f0f7ff").withAlpha(0.6),
        outlineColor: Cesium.Color.fromCssColorString("#2f4f6b").withAlpha(0.9),
        outlineWidth: 1,
        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
        scaleByDistance: new Cesium.NearFarScalar(50000, 1.2, 16000000, 0.35),
        disableDepthTestDistance: 12000000,
      },
    });
    countryEntity.__entry = country;
    countryMarkers.push(countryEntity);

    var subs = [];
    (country.subdivisions || []).forEach(function(sub) {
      var subEntity = viewer.entities.add({
        show: false,
        position: Cesium.Cartesian3.fromDegrees(sub.lo, sub.la, 0),
        point: {
          pixelSize: markerSize(sub.p, 4, 8),
          color: Cesium.Color.fromCssColorString("#8bc8ff").withAlpha(0.55),
          outlineColor: Cesium.Color.fromCssColorString("#1f3e5a").withAlpha(0.85),
          outlineWidth: 1,
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
          scaleByDistance: new Cesium.NearFarScalar(50000, 1.2, 12000000, 0.2),
          disableDepthTestDistance: 8000000,
        },
      });
      subEntity.__entry = sub;
      subs.push(subEntity);
    });
    subMarkers.set(country.iso, subs);
  });

  return { country: countryMarkers, subdivisionsByIso: subMarkers };
}

function setupInputHandlers(viewer, onHoverRef, onSelectRef) {
  var handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);

  var lastHoverEntry = null;
  var pickThrottleTimer = null;
  handler.setInputAction(function(movement) {
    if (pickThrottleTimer) return;
    pickThrottleTimer = setTimeout(function() { pickThrottleTimer = null; }, 60);
    var pick = viewer.scene.pick(movement.endPosition);
    var entry = getPickedEntry(pick);
    var changed = entry !== lastHoverEntry;
    lastHoverEntry = entry;
    if (changed) {
      onHoverRef.current(entry);
      viewer.container.style.cursor = entry ? "pointer" : "grab";
      viewer.scene.requestRender();
    }
  }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

  handler.setInputAction(function(click) {
    var pick = viewer.scene.pick(click.position);
    var entry = getPickedEntry(pick);
    onSelectRef.current(entry || null);
    viewer.scene.requestRender();
  }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

  return handler;
}

function setupAutoRotate(viewer, autoRotateRef) {
  var onTick = function() {
    if (!autoRotateRef.current) return;
    viewer.scene.camera.rotate(Cesium.Cartesian3.UNIT_Z, -0.00045);
    viewer.scene.requestRender();
  };
  viewer.clock.onTick.addEventListener(onTick);
  return onTick;
}

function setupCameraToggles(viewer, layersRef, layersStateRef) {
  var onCameraChanged = function() {
    var height = viewer.camera.positionCartographic.height;
    if (layersRef.current.population && layersStateRef.current.population) {
      layersRef.current.population.setSubdivisionsVisible(height < 12000000);
    }
    if (layersRef.current.buildings) {
      var isGoogleActive = layersRef.current.googleTiles && layersRef.current.googleTiles.show;
      layersRef.current.buildings.show = layersStateRef.current.buildings && !isGoogleActive && (height < 1800000);
    }
    viewer.scene.requestRender();
  };
  viewer.camera.changed.addEventListener(onCameraChanged);
  onCameraChanged();
  return onCameraChanged;
}

function cleanupAll(resources) {
  if (resources.onTick && resources.viewer) {
    try { resources.viewer.clock.onTick.removeEventListener(resources.onTick); } catch { /* already cleaned */ }
  }
  if (resources.onCameraChanged && resources.viewer) {
    try { resources.viewer.camera.changed.removeEventListener(resources.onCameraChanged); } catch { /* already cleaned */ }
  }
  if (resources.handler) {
    try { resources.handler.destroy(); } catch { /* already cleaned */ }
  }
  if (resources.registry) {
    try { resources.registry.destroy(); } catch { /* already cleaned */ }
  }
  if (resources.viewer && !resources.viewer.isDestroyed()) {
    try { resources.viewer.destroy(); } catch { /* already cleaned */ }
  }
}

// --- Component ---

export { markerSize, getEntryHeight, getPickedEntry };

import { useAppStore } from "./store/useAppStore.js";

export default function CesiumGlobe() {
  var onHover = useAppStore(function (s) { return s.setHov; });
  var onSelect = useAppStore(function (s) { return s.setSel; });
  var autoRotate = useAppStore(function (s) { return s.autoR; });
  var expanded = useAppStore(function (s) { return s.expanded; });
  var expandedStates = useAppStore(function (s) { return s.expandedStates; });
  var loadedCounties = useAppStore(function (s) { return s.loadedCounties; });
  var selection = useAppStore(function (s) { return s.sel; });
  var layersToggleState = useAppStore(function (s) { return s.layers; });

  var mountRef = useRef(null);
  var viewerRef = useRef(null);
  var handlerRef = useRef(null);
  var onHoverRef = useRef(onHover);
  var onSelectRef = useRef(onSelect);
  var autoRotateRef = useRef(autoRotate);
  var markersRef = useRef({
    country: [],
    subdivisionsByIso: new Map(),
    countiesByFp: new Map(),
  });
  var layersRef = useRef({
    population: null,
    cities: null,
    buildings: null,
    earthquakes: null,
    googleTiles: null,
    airQuality: null,
    pollen: null,
    weather: null,
    solar: null,
  });
  var layersStateRef = useRef(layersToggleState);

  var [loading, setLoading] = useState(true);
  var [err, setErr] = useState(null);

  useEffect(() => {
    layersStateRef.current = layersToggleState;
    if (!viewerRef.current) return;
    
    var cl = layersRef.current;
    
    if (cl.earthquakes && cl.earthquakes.dataSource) {
      cl.earthquakes.dataSource.show = !!layersToggleState.earthquakes;
    }
    if (cl.cities && cl.cities.dataSource) {
      cl.cities.dataSource.show = !!layersToggleState.cities;
      if (cl.cities.refreshVisibility) cl.cities.refreshVisibility();
    }
    if (cl.googleTiles) {
      cl.googleTiles.show = !!layersToggleState.googleTiles;
    }
    if (cl.population && cl.population.countryDataSource) {
      cl.population.countryDataSource.show = !!layersToggleState.population;
      // also force manual toggle of subdivisions on zoom refresh
      if (!layersToggleState.population) cl.population.setSubdivisionsVisible(false);
      else {
        var ht = viewerRef.current.camera.positionCartographic.height;
        cl.population.setSubdivisionsVisible(ht < 12000000);
      }
    }
    if (cl.buildings) {
      var isGoogleActive = cl.googleTiles && cl.googleTiles.show;
      var h = viewerRef.current.camera.positionCartographic.height;
      cl.buildings.show = !!layersToggleState.buildings && !isGoogleActive && (h < 1800000);
    }
    if (cl.airQuality && cl.airQuality.setVisible) {
      cl.airQuality.setVisible(!!layersToggleState.airQuality);
    }
    if (cl.pollen && cl.pollen.setVisible) {
      cl.pollen.setVisible(!!layersToggleState.pollen);
    }
    if (cl.weather && cl.weather.setVisible) {
      cl.weather.setVisible(!!layersToggleState.weather);
    }
    if (cl.solar && cl.solar.setVisible) {
      cl.solar.setVisible(!!layersToggleState.solar);
    }

    viewerRef.current.scene.requestRender();
  }, [layersToggleState]);

  useEffect(
    function() {
      onHoverRef.current = onHover;
      onSelectRef.current = onSelect;
    },
    [onHover, onSelect],
  );

  useEffect(
    function() {
      autoRotateRef.current = autoRotate;
    },
    [autoRotate],
  );

  useEffect(function() {
    var dead = false;
    var resources = {};

    async function init() {
      try {
        configureIonToken();
        var terrainProvider = await createTerrainProvider();
        if (dead) return;

        var viewer = initViewer(mountRef.current, terrainProvider);
        resources.viewer = viewer;
        viewerRef.current = viewer;

        var registry = createLayerRegistry();
        resources.registry = registry;

        var populationLayer = await createPopulationLayer(viewer);
        if (dead) { cleanupAll(resources); return; }
        registry.register("population", populationLayer);
        layersRef.current.population = populationLayer;

        var cityLayer = await createCityLayer(viewer);
        if (dead) { cleanupAll(resources); return; }
        registry.register("cities", cityLayer);
        layersRef.current.cities = cityLayer;

        var buildings = await createBuildingsLayer(viewer);
        if (dead) { cleanupAll(resources); return; }
        layersRef.current.buildings = buildings;

        var googleTiles = await createGoogleTilesLayer(viewer);
        if (dead) { cleanupAll(resources); return; }
        layersRef.current.googleTiles = googleTiles;

        var earthquakeLayer = await createEarthquakeLayer(viewer);
        if (dead) { cleanupAll(resources); return; }
        registry.register("earthquakes", earthquakeLayer);
        layersRef.current.earthquakes = earthquakeLayer;

        var airQualityLayer = await createAirQualityLayer(viewer);
        if (dead) { cleanupAll(resources); return; }
        if (airQualityLayer) {
          registry.register("airQuality", airQualityLayer);
          layersRef.current.airQuality = airQualityLayer;
          airQualityLayer.setVisible(!!useAppStore.getState().layers.airQuality);
        }

        var pollenLayer = await createPollenLayer(viewer);
        if (dead) { cleanupAll(resources); return; }
        if (pollenLayer) {
          registry.register("pollen", pollenLayer);
          layersRef.current.pollen = pollenLayer;
          pollenLayer.setVisible(!!useAppStore.getState().layers.pollen);
        }

        var weatherLayer = await createWeatherLayer(viewer);
        if (dead) { cleanupAll(resources); return; }
        if (weatherLayer) {
          registry.register("weather", weatherLayer);
          layersRef.current.weather = weatherLayer;
          weatherLayer.setVisible(!!useAppStore.getState().layers.weather);
        }

        var solarLayer = await createSolarLayer(viewer);
        if (dead) { cleanupAll(resources); return; }
        if (solarLayer) {
          registry.register("solar", solarLayer);
          layersRef.current.solar = solarLayer;
          solarLayer.setVisible(!!useAppStore.getState().layers.solar);
        }

        var markers = createMarkers(viewer);
        markersRef.current.country = markers.country;
        markersRef.current.subdivisionsByIso = markers.subdivisionsByIso;

        var handler = setupInputHandlers(viewer, onHoverRef, onSelectRef);
        resources.handler = handler;
        handlerRef.current = handler;

        resources.onTick = setupAutoRotate(viewer, autoRotateRef);
        resources.onCameraChanged = setupCameraToggles(viewer, layersRef, layersStateRef);

        setLoading(false);
      } catch (error) {
        console.error("Cesium init failed:", error);
        cleanupAll(resources);
        setErr(error && error.message ? error.message : String(error));
        setLoading(false);
      }
    }

    init();

    return function() {
      dead = true;
      onHoverRef.current(null);
      cleanupAll(resources);
      viewerRef.current = null;
      handlerRef.current = null;
      layersRef.current = { population: null, cities: null, buildings: null, earthquakes: null, googleTiles: null, airQuality: null, pollen: null, weather: null, solar: null };
    };
  }, []);

  useEffect(
    function() {
      var markerSets = markersRef.current.subdivisionsByIso;
      if (!markerSets || markerSets.size === 0) return;
      var population = layersRef.current.population;
      markerSets.forEach(function(markers, iso) {
        var shouldShow = !!expanded[iso];
        markers.forEach(function(entity) {
          entity.show = shouldShow;
        });
        if (population) {
          if (shouldShow) {
            population.loadSubdivision(iso);
          } else {
            population.unloadSubdivision(iso);
          }
        }
      });
      if (viewerRef.current) viewerRef.current.scene.requestRender();
    },
    [expanded],
  );

  useEffect(
    function() {
      var viewer = viewerRef.current;
      if (!viewer) return;

      var map = markersRef.current.countiesByFp;
      Object.keys(loadedCounties).forEach(function(fp) {
        var counties = loadedCounties[fp];
        if (!counties || !counties.length) return;
        if (!map.has(fp) && expandedStates[fp]) {
          var entities = counties.map(function(county) {
            var entity = viewer.entities.add({
              show: true,
              position: Cesium.Cartesian3.fromDegrees(county.lo, county.la, 0),
              point: {
                pixelSize: markerSize(county.p, 3, 7),
                color: Cesium.Color.fromCssColorString("#b5ddff").withAlpha(0.56),
                outlineColor: Cesium.Color.fromCssColorString("#335771").withAlpha(0.9),
                outlineWidth: 1,
                heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
                scaleByDistance: new Cesium.NearFarScalar(30000, 1.2, 3000000, 0.18),
                disableDepthTestDistance: 3000000,
              },
            });
            entity.__entry = county;
            return entity;
          });
          map.set(fp, entities);
        }
      });

      var toRemove = [];
      map.forEach(function(entities, fp) {
        if (!expandedStates[fp]) {
          entities.forEach(function(entity) {
            viewer.entities.remove(entity);
          });
          toRemove.push(fp);
        }
      });
      toRemove.forEach(function(fp) {
        map.delete(fp);
      });

      viewer.scene.requestRender();
    },
    [loadedCounties, expandedStates],
  );

  useEffect(
    function() {
      var viewer = viewerRef.current;
      if (!viewer) return;

      if (!selection) {
        viewer.scene.requestRender();
        return;
      }

      var lo = Number(selection.lo);
      var la = Number(selection.la);
      if (!Number.isFinite(lo) || !Number.isFinite(la)) return;

      viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(lo, la, getEntryHeight(selection)),
        duration: 1.2,
        easingFunction: Cesium.EasingFunction.CUBIC_OUT,
      });
    },
    [selection],
  );

  return (
    <div ref={mountRef} className="flex-1 relative cursor-grab">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#050810]/70 z-20">
          <div className="text-center">
            <div className="w-8 h-8 border-3 border-[rgba(60,120,220,0.15)] border-t-[#3a80e0] rounded-full animate-[globespin_0.8s_linear_infinite] mx-auto mb-2" />
            <div className="text-[#5a7ea0] text-xs">Loading globe layers...</div>
          </div>
        </div>
      )}
      {err && (
        <div className="absolute bottom-2.5 left-2.5 bg-red-600/80 text-white py-1 px-2.5 rounded text-[11px] z-20">
          {err}
        </div>
      )}
    </div>
  );
}
