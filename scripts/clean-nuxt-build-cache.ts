import { existsSync, rmSync } from "node:fs";
import { resolve } from "node:path";

// Nitro's persistent unstorage cache (`.data`, filesystem-backed) survives
// across separate `nuxt build` invocations by design — it's meant to speed up
// incremental rebuilds. `nuxi cleanup` does NOT remove it (only `.nuxt`,
// `.output`, `dist`, `node_modules/.vite`, `node_modules/.cache` — verified
// against @nuxt/cli's own cleanupNuxtDirs source). That gap let a locale
// rename (`pt-BR` -> `pt-br`) leave a stale cached message bundle keyed under
// the OLD casing in `.data`, silently falling back to English at runtime
// while the language switcher still showed Portuguese as selected. Run this
// before every production build so a renamed/removed i18n key, route, or
// locale can never ship from a stale cache again.
//
// Runs with cwd = the calling app's directory (apps/web, apps/app, ...),
// matching how a package.json script's cwd works.
const DIRS_TO_CLEAN = [".nuxt", ".output", ".data"];

for (const dir of DIRS_TO_CLEAN) {
  const path = resolve(process.cwd(), dir);
  if (existsSync(path)) {
    rmSync(path, { recursive: true, force: true });
    console.log(`clean-nuxt-build-cache: removed ${path}`);
  }
}
