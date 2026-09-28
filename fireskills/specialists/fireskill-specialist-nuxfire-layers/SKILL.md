---
name: fireskill-specialist-nuxfire-layers
description: Create, register, activate, and compose Nuxt Layers in the Nuxfire monorepo — `layers/<name>`, `config.ts` (`layers.core`/`layers.features`), `layer.manifest.ts`, `scripts/compose-layers.ts`, generated `.composition/` files, `package.json` exports, ability/component naming conventions, i18n, and per-layer testing. Use when creating a layer, moving code to/from a layer, toggling layers, or modifying `apps/app/nuxt.config.ts`; specific to Nuxfire architecture.
---

# Nuxfire Layers

## When to Use

- Activate when creating a layer, deciding whether logic belongs in a layer or Composition Root, toggling layers in `config.ts`, or moving pages, components, routers, or schemas between layers.
- Activate when debugging: inactive layers still resolving, conflicting abilities, broken navigation links for disabled features, or inverted middleware order.
- Do not activate for generic Nuxt pages or composables: use `$fireskill-specialist-nuxt`. For layer subcomponents, use domain specialists: `-trpc`, `-drizzle`, `-nuxt-authorization`, `-nuxt-ui`.
- Combine with `$fireskill-specialist-software-architecture` and `$fireskill-specialist-domain-modeling` to establish bounded contexts, and `$fireskill-specialist-sst` (`flags` vs `layers`).

## Workflow

1. Read [references/nuxfire-layers.md](references/nuxfire-layers.md) and [references/new-layer-recipe.md](references/new-layer-recipe.md).
2. Classify as **core** (permanently enabled) or **feature** (toggleable). Mechanics are identical: registration uses the same pattern.
3. Use `layers/kanban` as the canonical reference implementation.
4. Register in `config.ts`; let `compose-layers` regenerate composition targets.
5. Validate enabled **and** disabled states.

## Key Rules

- Composition Root (`apps/app`) contains no domain business logic; all domain code belongs in `layers/`.
- Core layer registration = adding name to `layers.core` in `config.ts`. No manual imports elsewhere.
- Active status has **one** source of truth: `activeLayerNames` in `config.ts`. Never determine activation from disk contents.
- `package.json` exports: `exports["."]` = `./nuxt.config.ts`; manifest at `./manifest`; wildcards declare extensions (`"./shared/*": "./shared/*.ts"`).
- Layer `nuxt.config.ts`: define `$meta.name` and `components: [{ path: "./components" }]`. **No `prefix` setting**; component names are derived from files (`Kanban*.vue`).
- Manifest `name` matches directory name literally (parsed via regex).
- `server/trpc/router.ts` exports `routers` map using `satisfies`; composition engine imports by this fixed symbol.
- Abilities carry the layer prefix; procedures do **not** carry prefixes.
- Every package imported by a layer must be explicitly listed in its `package.json`.
- Layer without `app/` directory specifies `srcDir: "app"`.
- Global middleware does not support cross-layer ordering; order-critical middleware resides in Composition Root. Layer plugins declare `dependsOn`.
- Database schemas: add manual line in barrel via package specifier; never relative paths.
- Migration history is per-layer, never shared (SPEC-0006): a feature layer that owns tables gets its own `drizzle.config.ts`/`migrations/`, generated and applied from that layer's own directory. A feature never turned on never has its migration run — its tables never exist, not even empty. Deactivating an *already-active* feature does not retroactively drop its tables (that stays a separate, reviewed, destructive operation). See `$fireskill-specialist-drizzle`, `references/new-table-recipe.md`.
- No independent infrastructure per layer (Durable Objects, queues, crons); share provisioned resources.
- Multilingual i18n support across all 3 languages with matching keys (`bun run check:i18n`).
- Never edit `.composition/*` files manually.

## Anti-patterns

- Determining active status by disk presence (causes 404 links and callable routers when deactivated).
- Pointing `exports["."]` to `layer.manifest.ts`.
- Configuring `components.prefix` when files already carry prefixes.
- Creating abilities without layer prefixes; adding prefixes to tRPC procedure names.
- Moving global auth middleware into a layer and breaking post-login redirect flows.
- Relying on transitive dependencies instead of declaring direct dependencies.
- Using relative imports from `layers/` inside `apps/functions`.
- Moving domain logic back into `apps/app`.
- Creating empty convenience layers lacking coherent domain models.
- Generating a feature layer's migration from `apps/functions/` instead of the layer's own directory, or editing `apps/functions/drizzle.config.ts` to "add" a feature's schema — that config only ever globs `layers.core`.
- Editing `infra/utils/nuxt.ts` to add a per-feature migration branch — its deploy loop already discovers any `layers.features` entry with a `migrations/` folder automatically.

## Validation

- Start app: verify `compose-layers: N active layer(s) […]` lists layer; confirm entries in `.composition/layer-routers.ts` and `layer-navigation.ts`.
- Toggle in `config.ts`: verify pages, procedures, and menu links disappear and reappear in sync.
- Verify `.nuxt/components.d.ts` contains expected component type declarations.
- Inspect compiled build (`dist/server/chunks/virtual/entry.mjs`) when modifying layouts or middleware.
- `bun run typecheck` (`apps/app`), `bunx vue-tsc --noEmit -p server/tsconfig.json` (server), `bun run test`, and `bun run check:i18n`.
- When `apps/functions` imports from layer: verify bundling via `sst deploy` on test stage or `esbuild` per handler.

## Related Skills

- `$fireskill-specialist-nuxt` — Nuxt 4 application patterns.
- `$fireskill-specialist-trpc`, `$fireskill-specialist-drizzle`, `$fireskill-specialist-nuxt-authorization`, `$fireskill-specialist-nuxt-ui`.
- `$fireskill-specialist-sst` — `flags` (Cloudflare resources) vs `layers` (application code).
- `$fireskill-specialist-software-architecture` and `$fireskill-specialist-domain-modeling`.
