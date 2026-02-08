import { defineConfig, mergeConfig } from "vitest/config";
import viteConfig from "./vite.config.js";

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      globals: true,
      environment: "jsdom",
      setupFiles: ["./tests/setup.js"],
      include: ["tests/**/*.test.{js,jsx}"],
      exclude: ["node_modules", "dist"],
      css: false,
      coverage: {
        provider: "v8",
        reporter: ["text", "text-summary", "html", "lcov"],
        reportsDirectory: "./coverage",
        include: ["src/**/*.{js,jsx}"],
        exclude: [
          "src/main.jsx",
          "src/data/countries.js",
          "src/data/idMap.js",
          "src/data/us-counties/*.js",
        ],
        thresholds: {
          statements: 60,
          branches: 50,
          functions: 60,
          lines: 60,
        },
      },
    },
  }),
);
