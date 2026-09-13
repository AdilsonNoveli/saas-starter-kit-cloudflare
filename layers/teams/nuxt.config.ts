export default defineNuxtConfig({
  $meta: {
    // Intended to give the layer its official `#layers/teams` import alias.
    name: "teams",
  },
  components: [
    {
      path: "./components",
      // No `prefix` option, same reasoning as layers/kanban/nuxt.config.ts:
      // every file here is already named `Team*.vue` (singular — they
      // predate this layer, moved from packages/app/app/components/team+
      // members/ in Fase 3 passo 1b, and TeamSwitcherDropdown is referenced
      // by name from the Composition Root's layouts/dashboard.vue). `prefix`
      // prepends unconditionally with no de-dup, so adding "Team" here would
      // render `<TeamSwitcher>` as `<TeamTeamSwitcher>` and break that
      // reference. `path` stays explicit for the same reason as kanban's.
    },
  ],
});

// ---------------------------------------------------------------------------
// This file (and layers/kanban's) was NOT actually loaded by Nuxt from Fase 2
// through Fase 3 passo 1b — `extends` resolves a layer package through its
// `exports["."]`, which pointed at `./layer.manifest.ts`. Fixed by making `.`
// point at this file instead and moving the manifest to a `./manifest`
// subpath (scripts/compose-layers.ts updated to match). Verified by setting
// `prefix` to a nonsense value and watching `.nuxt/components.d.ts` actually
// change (it previously didn't), which is also what surfaced the `path`
// double-`/app/` bug fixed above and the prefix/filename stutter documented
// in the components block's comment. Full writeup: _docs/AGENTS.md, "Nuxt
// Layers architecture".
// ---------------------------------------------------------------------------
