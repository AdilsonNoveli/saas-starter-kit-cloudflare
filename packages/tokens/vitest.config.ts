import { defineConfig } from "vitest/config";

// Registered explicitly in the root aggregator (vitest.config.mts).
export default defineConfig({
  test: {
    environment: "node",
    include: ["*.test.ts"],
  },
});
