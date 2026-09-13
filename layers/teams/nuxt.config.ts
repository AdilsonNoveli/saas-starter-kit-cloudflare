export default defineNuxtConfig({
  $meta: {
    // Intended to give the layer its official `#layers/teams` import alias.
    name: "teams",
  },
  components: [
    {
      path: "./app/components",
      // Singular `Team`, not `Teams`: the components were already named
      // <TeamSwitcher>/<TeamSwitcherDropdown>/<TeamCreateModal> before Fase 3
      // passo 1b moved them here, and TeamSwitcherDropdown is referenced by
      // name from the Composition Root's layouts/dashboard.vue — a plural
      // prefix would rename a call site outside this layer for nothing.
      prefix: "Team",
    },
  ],
});

// ---------------------------------------------------------------------------
// READ THIS BEFORE RELYING ON ANYTHING ABOVE.
//
// **Nuxt does not currently load this file.** Verified in Fase 3 passo 1b by
// setting `prefix` to a nonsense value and confirming `.nuxt/components.d.ts`
// did not change, then by dumping `loadNuxtConfig()._layers[].configFile`:
// for both `layers/teams` and `layers/kanban` it is `layer.manifest.ts`, not
// `nuxt.config.ts`. The cause is this layer's own `package.json` — `extends`
// resolves `@nuxfire/layer-teams` through the package's `exports["."]`, which
// points at `./layer.manifest.ts`, so c12 loads the MANIFEST as the layer's
// Nuxt config. Its keys (`name`, `permissions`, …) are not Nuxt options, so
// nothing breaks — but nothing here applies either, and `#layers/teams` does
// not exist as an alias.
//
// Consequences that are load-bearing right now:
//   - The component namespace comes from the FILENAMES, not from `prefix`.
//     Every component in app/components/ is named `Team*.vue` so it registers
//     as <Team*> regardless — exactly how layers/kanban's `Kanban*.vue` files
//     have always really worked (its identical `prefix: "Kanban"` is inert
//     too; it just happens to agree with its filenames).
//   - app/pages, app/components, app/composables and app/middleware are still
//     picked up, by Nuxt's per-layer directory convention off `rootDir`, which
//     is resolved correctly.
//
// The block above is kept rather than deleted as dead config because it is the
// declaration this layer must carry once the resolution is fixed, and because
// it already agrees with the filenames — making it live would change no
// component name. Fixing it is its own change, deliberately not part of passo
// 1b: naively making layer configs load would replace each layer's default
// `<srcDir>/components` scan with `./app/components` resolved against srcDir
// (`layers/*/app/app/components`, which does not exist) and every layer
// component would silently disappear. See _docs/AGENTS.md, "Nuxt Layers
// architecture".
// ---------------------------------------------------------------------------
