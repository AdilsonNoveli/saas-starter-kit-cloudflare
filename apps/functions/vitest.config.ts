import { defineConfig } from "vitest/config";

// Test harness for the Workers package. The root aggregator (vitest.config.mts) picks this
// project up once `apps/functions` is listed in `test.projects`.
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
