import { defineConfig } from "vitest/config";

// Root aggregator for every Vitest suite in the monorepo.
//
// NOTE: this is deliberately NOT a `vitest.workspace.ts`. `defineWorkspace` and
// the standalone workspace file were removed in Vitest 4 and do not exist in
// the version pinned here (`vitest@5`) — `vitest/config` only exports
// `defineConfig`/`defineProject`. The replacement is `test.projects`, which
// takes the same directory/glob entries a workspace file used to.
//
// `layers/*` matches nothing today; it exists so Nuxt layers created from Phase
// 2 onward are picked up automatically once they ship a `vitest.config.ts`.
//
// The `.mts` extension is load-bearing: the root `package.json` is not
// `"type": "module"` (SST and `scripts/` live there), so Vite's native config
// loader warns on ESM syntax in a plain `.ts` file here.
export default defineConfig({
  test: {
    projects: ["apps/app", "layers/*", "scripts"],
  },
});
