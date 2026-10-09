import { defineAbility } from "nuxt-authorization/utils";

// `shared/utils/abilities.ts` calls `defineAbility()` with no import statement
// because Nuxt auto-imports it. Vitest runs these files as plain Node modules
// with no Nuxt build pipeline, so the auto-import never happens — this shim
// puts the real implementation on `globalThis` before any test file loads.
// Same shim as layers/teams/vitest.setup.ts, deliberately duplicated: a layer
// has to be runnable on its own, without reaching into the Composition Root.
Object.assign(globalThis, { defineAbility });
