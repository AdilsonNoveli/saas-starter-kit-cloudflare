import { defineConfig } from "vitest/config";

// Registered in the root aggregator (vitest.config.mts); `.mts` matches the other
// project configs (scripts, root).
//
// Only pure TypeScript modules under `app/` are tested here (the SEO builders): they
// must not depend on Nuxt auto-imports, which do not exist under Vitest.
export default defineConfig({
  test: {
    environment: "node",
    include: ["app/**/*.test.ts"],
  },
});
