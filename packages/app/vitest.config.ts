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
    include: ["server/**/*.test.ts"],
  },
});
