import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts"],
  format: "esm",
  dts: true,
  clean: true,
  treeshake: true,
  external: [
    "@oxlint/plugins",
    "@typescript-eslint/utils",
    "typescript-eslint",
  ],
  outExtensions: () => ({ js: ".js" }),
});
