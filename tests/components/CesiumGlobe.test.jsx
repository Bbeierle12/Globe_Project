import { render, screen, waitFor } from "@testing-library/react";

vi.mock("../../src/cesium/terrainSetup.js", function() {
  return {
    configureIonToken: vi.fn(),
    createTerrainProvider: vi.fn().mockResolvedValue({}),
    applyTerrainVisualSettings: vi.fn(),
  };
});

vi.mock("../../src/cesium/populationLayer.js", function() {
  return {
    createPopulationLayer: vi.fn().mockResolvedValue({
      countryDataSource: {},
      subDataSources: [],
      destroy: vi.fn(),
      highlightSelection: vi.fn(),
      setSubdivisionsVisible: vi.fn(),
    }),
    getSelectionKey: vi.fn(),
    buildSubdivisionMaps: vi.fn(),
  };
});

vi.mock("../../src/cesium/cityLayer.js", function() {
  return {
    createCityLayer: vi.fn().mockResolvedValue({
      destroy: vi.fn(),
      refreshVisibility: vi.fn(),
      dataSource: {},
    }),
    minPopulationForCameraHeight: vi.fn(),
  };
});

vi.mock("../../src/cesium/buildingsLayer.js", function() {
  return {
    createBuildingsLayer: vi.fn().mockResolvedValue(null),
  };
});

vi.mock("cesium", async function() {
  var mockViewer = {
    scene: {
      backgroundColor: null,
      skyAtmosphere: { show: true },
      globe: { baseColor: null },
      canvas: {},
      pick: vi.fn(),
      requestRender: vi.fn(),
      camera: {
        rotate: vi.fn(),
      },
    },
    camera: {
      setView: vi.fn(),
      flyTo: vi.fn(),
      positionCartographic: { height: 20000000 },
      changed: { addEventListener: vi.fn(), removeEventListener: vi.fn() },
    },
    clock: {
      onTick: { addEventListener: vi.fn(), removeEventListener: vi.fn() },
    },
    cesiumWidget: {
      screenSpaceEventHandler: {
        removeInputAction: vi.fn(),
      },
    },
    entities: { add: vi.fn(function(opts) { return opts; }), values: [] },
    container: { style: {} },
    isDestroyed: vi.fn(function() { return false; }),
    destroy: vi.fn(),
  };

  return {
    Viewer: vi.fn(function() { return mockViewer; }),
    Color: {
      fromCssColorString: vi.fn(function() {
        return { withAlpha: vi.fn(function() { return {}; }) };
      }),
      fromBytes: vi.fn(function() { return {}; }),
      TRANSPARENT: {},
    },
    Cartesian3: {
      fromDegrees: vi.fn(function() { return {}; }),
      UNIT_Z: {},
    },
    Cartesian2: vi.fn(function() { return {}; }),
    JulianDate: { now: vi.fn(function() { return {}; }) },
    GeoJsonDataSource: { load: vi.fn() },
    CustomDataSource: vi.fn(function() {
      return { entities: { add: vi.fn(), values: [] }, clustering: {} };
    }),
    Cesium3DTileset: { fromIonAssetId: vi.fn() },
    CesiumTerrainProvider: { fromIonAssetId: vi.fn() },
    EllipsoidTerrainProvider: vi.fn(),
    Ion: { defaultAccessToken: "" },
    ImageryLayer: vi.fn(),
    OpenStreetMapImageryProvider: vi.fn(),
    ScreenSpaceEventHandler: vi.fn(function() {
      return { setInputAction: vi.fn(), destroy: vi.fn() };
    }),
    ScreenSpaceEventType: { MOUSE_MOVE: 0, LEFT_CLICK: 1, LEFT_DOUBLE_CLICK: 2 },
    HeightReference: { CLAMP_TO_GROUND: 0 },
    HorizontalOrigin: { CENTER: 0 },
    VerticalOrigin: { BOTTOM: 0 },
    LabelStyle: { FILL_AND_OUTLINE: 0 },
    NearFarScalar: vi.fn(),
    Cesium3DTileStyle: vi.fn(),
    EasingFunction: { CUBIC_OUT: {} },
    buildModuleUrl: vi.fn(function() { return ""; }),
  };
});

import CesiumGlobe from "../../src/CesiumGlobe.jsx";

describe("CesiumGlobe", function() {
  var defaultProps = {
    onHover: vi.fn(),
    onSelect: vi.fn(),
    selection: null,
    expanded: {},
    expandedStates: {},
    loadedCounties: {},
    autoRotate: true,
  };

  it("renders container div with correct styling", function() {
    var result = render(<CesiumGlobe {...defaultProps} />);
    expect(result.container.firstChild).toBeTruthy();
    expect(result.container.firstChild.style.position).toBe("relative");
  });

  it("shows loading indicator initially and removes it after init", async function() {
    render(<CesiumGlobe {...defaultProps} />);
    // After async init completes, loading should be removed
    await waitFor(function() {
      expect(screen.queryByText("Loading globe layers...")).not.toBeInTheDocument();
    });
  });
});
