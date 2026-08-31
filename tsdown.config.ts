import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts", "src/oxlint.ts"],
  format: "esm",
  dts: true,
  clean: true,
  treeshake: true,
  deps: {
    neverBundle: ["@oxlint/plugins", "@typescript-eslint/utils", "oxlint"],
  },
  outExtensions: () => ({ js: ".js" }),
});
