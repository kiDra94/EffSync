import js from "@eslint/js";
import globals from "globals";
import pluginVue from "eslint-plugin-vue";
import pluginCypress from "eslint-plugin-cypress";
import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([
  globalIgnores(["dist/**", "coverage/**"]),
  { files: ["**/*.{js,mjs,cjs,vue}"], plugins: { js }, extends: ["js/recommended"], languageOptions: { globals: globals.browser } },
  pluginVue.configs["flat/essential"],
  {
    // Vitest runs with globals: true (vite.config.js)
    files: ["**/*.{spec,test}.js", "tests/**/*.js", "vitest.setup.js"],
    languageOptions: { globals: globals.vitest },
  },
  {
    // M25 (T79, T80, decision Q19): views and components only render; their
    // data comes through the stores, which use the api/ layer
    files: ["src/views/**/*.{js,vue}", "src/components/**/*.{js,vue}"],
    ignores: ["**/*.{spec,test}.js"],
    rules: {
      "no-restricted-imports": ["error", {
        // review M25: the HTTP client itself (axios) as well
        patterns: [{
          group: ["@/api", "@/api/*", "**/api/*", "axios"],
          message: "Views and components get their data through a store (decision Q19).",
        }],
      }],
      "no-restricted-globals": ["error", {
        name: "fetch",
        message: "Views and components get their data through a store (decision Q19).",
      }],
      "no-restricted-properties": ["error", {
        object: "window",
        property: "fetch",
        message: "Views and components get their data through a store (decision Q19).",
      }],
    },
  },
  {
    files: ["cypress/**/*.js", "cypress.config.js"],
    extends: [pluginCypress.configs.globals],
  },
]);
