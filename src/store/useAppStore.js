import { create } from "zustand";
import { COUNTY_FILE_MAP } from "../data/us-counties/index.js";

var useAppStore = create(function (set, get) {
  return {
    // UI State
    isSettingsOpen: false,
    search: "",
    setSettingsOpen: function (isOpen) { set({ isSettingsOpen: isOpen }); },
    toggleSettings: function () { set(function (s) { return { isSettingsOpen: !s.isSettingsOpen }; }); },
    setSearch: function (search) { set({ search: search }); },

    // Selection & Hover State
    hov: null,
    sel: null,
    setHov: function (hov) { set({ hov: hov }); },
    setSel: function (sel) { set({ sel: sel }); },

    // Expansion State
    expanded: {},
    expandedStates: {},
    countyLoading: {},
    loadedCounties: {},

    toggleExpand: function (iso) {
      set(function (s) { return { expanded: { ...s.expanded, [iso]: !s.expanded[iso] } }; });
    },

    toggleExpandState: function (fp) {
      var s = get();
      var willExpand = !s.expandedStates[fp];
      set({ expandedStates: { ...s.expandedStates, [fp]: willExpand } });

      if (!willExpand || s.loadedCounties[fp] || s.countyLoading[fp]) return;
      var loader = COUNTY_FILE_MAP[fp];
      if (!loader) return;

      set({ countyLoading: { ...s.countyLoading, [fp]: true } });

      loader()
        .then(function (mod) {
          var varName = "COUNTIES_" + fp;
          var counties = mod[varName] || [];
          set(function (prev) {
            return {
              loadedCounties: { ...prev.loadedCounties, [fp]: counties },
              countyLoading: { ...prev.countyLoading, [fp]: false },
            };
          });
        })
        .catch(function (error) {
          console.error("Failed to load counties for state " + fp + ":", error);
          set(function (prev) { return { countyLoading: { ...prev.countyLoading, [fp]: false } }; });
        });
    },

    // Settings State
    autoR: true,
    setAutoR: function (autoR) { set({ autoR: autoR }); },

    layers: {
      buildings: false,
      earthquakes: true,
      cities: true,
      googleTiles: true,
      population: true,
      airQuality: false,
      pollen: false,
      weather: false,
      solar: false,
    },
    toggleLayer: function (layerName) {
      set(function (s) { return { layers: { ...s.layers, [layerName]: !s.layers[layerName] } }; });
    },

    // API key overrides (consumed by cesium layer init, not exposed in UI yet)
    apiKeys: {
      cesiumIon: "",
      googleMaps: "",
    },
    setApiKey: function (keyName, value) {
      set(function (s) { return { apiKeys: { ...s.apiKeys, [keyName]: value } }; });
    },
  };
});

export { useAppStore };
