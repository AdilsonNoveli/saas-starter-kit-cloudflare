import { defineConfig } from "vitest/config";

// `.mts` for the same reason as the root aggregator: this package.json is not "type": "module".
// Registered explicitly in the root aggregator (vitest.config.mts): `scripts/` holds the
// build/deploy tooling (branding loader, doctor), which has no other test project.
export default defineConfig({
  test: {
    environment: "node",
    include: ["*.test.ts"],
  },
});
