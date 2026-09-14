import { defineAbility } from "nuxt-authorization/utils";

// `shared/utils/abilities.ts` calls `defineAbility()` with no import statement
// because Nuxt auto-imports it from `nuxt-authorization`. Vitest runs these
// files as plain Node modules with no Nuxt build pipeline, so the auto-import
// never happens — this shim puts the real implementation on `globalThis`
// before any test file is imported. Keep it in sync with whatever
// `nuxt-authorization` registers via `addImports` if that list grows.
Object.assign(globalThis, { defineAbility });
