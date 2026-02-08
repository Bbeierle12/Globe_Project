import "@testing-library/jest-dom";

// Global Cesium mock for unit and component tests.
// Individual tests can override specific exports via vi.mocked().
vi.mock("cesium", () => ({
  Viewer: vi.fn(),
  Color: {
    fromCssColorString: vi.fn(() => ({
      withAlpha: vi.fn(() => ({})),
    })),
    fromBytes: vi.fn(() => ({})),
    fromAlpha: vi.fn(() => ({})),
    TRANSPARENT: {},
  },
  Cartesian3: {
    fromDegrees: vi.fn(() => ({})),
    UNIT_Z: {},
  },
  Cartesian2: vi.fn(() => ({})),
  JulianDate: { now: vi.fn(() => ({})) },
  GeoJsonDataSource: { load: vi.fn() },
  CustomDataSource: vi.fn(() => ({
    entities: { add: vi.fn(), values: [] },
    clustering: { enabled: false, pixelRange: 0, minimumClusterSize: 0 },
  })),
  Cesium3DTileset: { fromIonAssetId: vi.fn() },
  CesiumTerrainProvider: { fromIonAssetId: vi.fn() },
  EllipsoidTerrainProvider: vi.fn(),
  Ion: { defaultAccessToken: "" },
  ImageryLayer: vi.fn(),
  OpenStreetMapImageryProvider: vi.fn(),
  ScreenSpaceEventHandler: vi.fn(() => ({
    setInputAction: vi.fn(),
    destroy: vi.fn(),
  })),
  ScreenSpaceEventType: { MOUSE_MOVE: 0, LEFT_CLICK: 1, LEFT_DOUBLE_CLICK: 2 },
  HeightReference: { CLAMP_TO_GROUND: 0 },
  HorizontalOrigin: { CENTER: 0 },
  VerticalOrigin: { BOTTOM: 0 },
  LabelStyle: { FILL_AND_OUTLINE: 0 },
  NearFarScalar: vi.fn(),
  Cesium3DTileStyle: vi.fn(),
  EasingFunction: { CUBIC_OUT: {} },
  buildModuleUrl: vi.fn(() => ""),
}));
