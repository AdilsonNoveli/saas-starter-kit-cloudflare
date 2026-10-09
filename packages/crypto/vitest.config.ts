import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Registered explicitly in the root aggregator (vitest.config.mts) by SPEC-0009 T035.
// `root` pins discovery to this folder, so `--config packages/crypto/vitest.config.ts`
// run from the repository root finds the same files as the aggregator.
export default defineConfig({
  root: fileURLToPath(new URL(".", import.meta.url)),
  test: {
    environment: "node",
    include: ["*.test.ts"],
  },
});
