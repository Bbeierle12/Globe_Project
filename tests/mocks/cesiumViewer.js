export function createMockViewer() {
  return {
    dataSources: {
      add: vi.fn(),
      remove: vi.fn(),
      length: 0,
    },
    entities: {
      add: vi.fn(function(config) {
        return {
          show: config.show !== undefined ? config.show : true,
          __entry: null,
          point: config.point || null,
          polygon: config.polygon || null,
          position: config.position || null,
        };
      }),
      values: [],
    },
    scene: {
      canvas: document.createElement("canvas"),
      pick: vi.fn(),
      requestRender: vi.fn(),
      backgroundColor: null,
      skyAtmosphere: { show: true },
      globe: {
        baseColor: null,
        enableLighting: false,
        showGroundAtmosphere: false,
        depthTestAgainstTerrain: false,
        showWaterEffect: false,
        dynamicAtmosphereLighting: false,
        dynamicAtmosphereLightingFromSun: false,
        oceanNormalMapUrl: "",
      },
      primitives: { add: vi.fn() },
      camera: { rotate: vi.fn() },
    },
    camera: {
      setView: vi.fn(),
      flyTo: vi.fn(),
      positionCartographic: { height: 10000000 },
      changed: {
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      },
    },
    clock: {
      onTick: {
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      },
    },
    cesiumWidget: {
      screenSpaceEventHandler: {
        removeInputAction: vi.fn(),
      },
    },
    container: { style: { cursor: "" } },
    isDestroyed: vi.fn(function() { return false; }),
    destroy: vi.fn(),
  };
}
