import { defineConfig } from "oxlint";

import { oxlintBaseConfig } from "./src/oxlint.ts";

export default defineConfig({
  env: {
    builtin: true,
    es2024: true,
    node: true,
  },
  extends: [{ ...oxlintBaseConfig, jsPlugins: [] }],
  ignorePatterns: [
    ".pnpm-store/**",
    ".tmp/**",
    "dist/**",
    "node_modules/**",
    "pnpm-lock.yaml",
  ],
  jsPlugins: [
    {
      name: "utilfirst",
      specifier: "./src/index.ts",
    },
  ],
  plugins: ["node"],
});
