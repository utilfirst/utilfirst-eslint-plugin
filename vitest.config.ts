import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    exclude: [...configDefaults.exclude, ".tmp/**"],
    include: ["src/**/*.test.ts"],
    setupFiles: ["./src/test-setup.ts"],
  },
});
