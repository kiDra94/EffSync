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
    files: ["cypress/**/*.js", "cypress.config.js"],
    extends: [pluginCypress.configs.globals],
  },
]);
