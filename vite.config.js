import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteStaticCopy } from "vite-plugin-static-copy";

var cesiumBaseUrl = "cesium";
var cesiumSource = "node_modules/cesium/Build/Cesium";

export default defineConfig({
  plugins: [
    react(),
    viteStaticCopy({
      targets: [
        { src: cesiumSource + "/Workers", dest: cesiumBaseUrl },
        { src: cesiumSource + "/Assets", dest: cesiumBaseUrl },
        { src: cesiumSource + "/ThirdParty", dest: cesiumBaseUrl },
        { src: cesiumSource + "/Widgets", dest: cesiumBaseUrl },
      ],
    }),
  ],
  define: {
    CESIUM_BASE_URL: JSON.stringify("/" + cesiumBaseUrl),
  },
});
