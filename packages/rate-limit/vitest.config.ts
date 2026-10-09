import { defineConfig } from "vitest/config";

// Registered explicitly in the root aggregator (vitest.config.mts) by SPEC-0009 T044.
export default defineConfig({
  test: {
    environment: "node",
    include: ["*.test.ts"],
  },
});
