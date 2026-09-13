import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Mirrors the `~~` alias Nuxt generates in .nuxt/tsconfig.json (`~~` / `~~/*`
// -> the app package root) so files under test can be imported by the exact
// same path they use in source, without pulling in the full Nuxt/Nitro build
// pipeline just to run unit tests.
export default defineConfig({
  resolve: {
    alias: {
      "~~": fileURLToPath(new URL(".", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    // `shared/` is a first-class Nuxt 4 source directory in this app (it holds
    // the RBAC permissions/abilities shared between client and server), so its
    // suites are collected alongside `server/`.
    include: ["server/**/*.test.ts", "shared/**/*.test.ts"],
    setupFiles: ["./vitest.setup.ts"],
  },
});
