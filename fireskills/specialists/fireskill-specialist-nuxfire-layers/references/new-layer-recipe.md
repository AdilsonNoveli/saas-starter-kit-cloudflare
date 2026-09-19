# Recipe: Creating a New Layer

Starting point: copy `layers/kanban` (concise feature layer with pages, router,
database schema, abilities, i18n, and tests) and adapt. Verify each step against code;
the code supersedes this document.

## Steps

1. **Folder and Package Setup** — `layers/<name>/` with `package.json`
   (`"name": "@nuxfire/layer-<name>"`, `"private": true`, `"type": "module"`,
   `exports` as described in `nuxfire-layers.md` §4, explicit dependencies). Depend on
   `@nuxfire/functions: workspace:*`, `@nuxfire/manifest: workspace:*`, and if scoped
   to tenant domains, `@nuxfire/layer-teams: workspace:*`.
2. **`nuxt.config.ts`** — strictly `$meta: { name: "<name>" }` and
   `components: [{ path: "./components" }]` (without `prefix`). Lacking an `app/` directory yet?
   Add `srcDir: "app"`.
3. **`layer.manifest.ts`** — `defineLayerManifest` with `name` **matching the folder name
   literally**, `requires`, `navigation.sidebar` (omit if no sidebar entry exists),
   and `permissions` (`<layer>:<resource>:<action>`).
4. **Permissions and Abilities** — `shared/utils/permissions.ts` and `shared/utils/abilities.ts`
   with **every export prefixed by `<name>`**; test in `abilities.test.ts`. See `$fireskill-specialist-nuxt-authorization`.
5. **Database Schema** (if tables exist) — `server/database/schema.ts`; add import line to barrel
   `apps/functions/src/database/schema.ts` via **package specifier**; add
   `@nuxfire/layer-<name>: workspace:*` to `apps/functions/package.json`; run `bun install`.
   See `$fireskill-specialist-drizzle`.
6. **tRPC Routing** (if endpoints exist) — `server/trpc/router.ts` exporting
   `routers = { <key>: <router> } satisfies Record<string, AnyRouter>`. See `$fireskill-specialist-trpc`.
7. **Frontend Views** — `app/pages/[[team]]/<name>/…`, components named `<Name>*.vue`
   (filename already supplies the prefix), composable exposing tRPC client slices.
   UI components: `$fireskill-specialist-nuxt-ui`.
8. **Localization** — `i18n/locales/{en,es,pt-BR}.json` sharing the **identical** key set
   (under a root `<name>` key).
9. **Test Suites** — `vitest.config.ts` and `vitest.setup.ts` (replicated from `kanban`);
   no configuration needed in the root aggregator.
10. **Enable Layer** — `config.ts`: `layers.core` (always active) or `layers.features`
    (`<name>: true`, toggleable).
11. Run `bun install` so Bun creates workspace symlinks.

## Verification (Never Rely Solely on "typecheck passed")

- Start Nuxt once: terminal logs from `compose-layers: N active layer(s) […]` must list the layer,
  and `.composition/layer-routers.ts` and `layer-navigation.ts` must include it.
- Disable the layer (`false`) and verify that pages, tRPC procedures, and sidebar entries
  **disappear together**. Re-enable the layer.
- `.nuxt/components.d.ts`: registered names match expectations (no redundant `<FooFooBar>`).
  To prove the layer's `nuxt.config.ts` evaluates, add a temporary dummy `prefix` and observe the diff;
  revert afterward.
- Named routes, layouts, and middleware resolve across layer boundaries: verify inside
  `nuxt build` (`dist/server/chunks/virtual/entry.mjs`), not `nuxt prepare`.
- Run `bun run typecheck` in `apps/app` **and** `bunx vue-tsc --noEmit -p server/tsconfig.json`
  in `apps/app` (`nuxt typecheck` ignores server files).
- Run `bun run test` (Vitest) and `bun run check:i18n`.
- If modifying code imported by `apps/functions` from `layers/`: run `sst deploy` on a test stage,
  or `bunx esbuild <handler> --bundle --platform=node` for each `handler:` declared in `infra/*.ts`.

## Common Troubleshooting

| Symptom | Cause |
|---|---|
| Layer `nuxt.config.ts` appears ignored | `exports["."]` targets the manifest instead of `nuxt.config.ts` |
| Layer components disappear | `path: "./app/components"` declared (must be `./components`) |
| Redundant `<KanbanKanbanBoard>` | `components.prefix` declared on already prefixed filenames |
| Ability missing or colliding | Export missing mandatory layer prefix |
| Disabled layer still exposes routes/menus | Code inferred active state purely from disk presence |
| `Could not resolve …/layers/…` during deploy | Relative path used in schema barrel file |
| Unexpected post-login redirect | Global middleware moved from `apps/app` into a layer |
| `bun install` reports cyclic dependencies | Informational only: `teams` ⇄ `billing` is an expected workspace cycle |
