import { defineConfig, type OxlintConfig } from "oxlint";

import { oxlintBaseConfig } from "./src/oxlint.ts";

const config: OxlintConfig = defineConfig({
  env: {
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

export default config;
