import { defineConfig } from "vitest/config";

// Picked up automatically by the root aggregator's `layers/*` project glob
// (vitest.config.mts) — there is nothing to register when a new layer is added.
export default defineConfig({
  test: {
    environment: "node",
    include: ["shared/**/*.test.ts", "server/**/*.test.ts"],
    setupFiles: ["./vitest.setup.ts"],
    // The first test of a file pays for importing drizzle-orm/nuxt-authorization on a cold
    // transform cache, which can exceed Vitest's default 5s when the machine is busy
    // (a full `bun run test` right after edits): a timeout there is not a failing test.
    testTimeout: 20_000,
  },
});
