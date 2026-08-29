import { defineConfig } from "oxlint";

import { oxlintBaseConfig } from "./src/oxlint.ts";

export default defineConfig({
  categories: {
    correctness: "error",
    pedantic: "error",
    perf: "error",
    suspicious: "error",
  },
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
  options: {
    reportUnusedDisableDirectives: "error",
    typeAware: true,
    typeCheck: true,
  },
  overrides: [
    {
      files: ["**/*.test.{ts,tsx,mts,cts}"],
      rules: {
        "typescript/no-unsafe-type-assertion": "off",
        "typescript/strict-void-return": "off",
      },
    },
    {
      files: ["**/*.{js,cjs,mjs}"],
      rules: {
        "typescript/no-unsafe-argument": "off",
        "typescript/no-unsafe-assignment": "off",
        "typescript/no-unsafe-call": "off",
        "typescript/no-unsafe-member-access": "off",
        "typescript/no-unsafe-return": "off",
      },
    },
  ],
  plugins: ["node"],
});
