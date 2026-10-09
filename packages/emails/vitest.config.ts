import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Registered explicitly in the root aggregator (vitest.config.mts) by SPEC-0010 T039.
// `root` pins discovery to this folder, same as packages/crypto/vitest.config.ts.
export default defineConfig({
  root: fileURLToPath(new URL(".", import.meta.url)),
  test: {
    environment: "node",
    include: ["templates/*.test.ts"],
    // The first react-email render (Tailwind compile) takes a few seconds on a cold run.
    testTimeout: 30_000,
  },
});
