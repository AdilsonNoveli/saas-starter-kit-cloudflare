import { defineConfig } from "vitest/config";

// Picked up automatically by the root aggregator's `layers/*` project glob
// (vitest.config.mts) — there is nothing to register when a new layer is added.
export default defineConfig({
  test: {
    environment: "node",
    include: ["shared/**/*.test.ts", "server/**/*.test.ts"],
    setupFiles: ["./vitest.setup.ts"],
  },
});
