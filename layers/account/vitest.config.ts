import { defineConfig } from "vitest/config";

// Picked up automatically by the root aggregator's `layers/*` project glob
// (vitest.config.mts) — there is nothing to register when a new layer is added.
export default defineConfig({
  test: {
    environment: "node",
    include: ["server/**/*.test.ts", "shared/**/*.test.ts", "app/**/*.test.ts"],
  },
});
