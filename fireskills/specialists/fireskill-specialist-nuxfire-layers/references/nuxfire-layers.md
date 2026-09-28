# Nuxfire Layers — What Actually Exists in the Codebase

Each statement includes concrete file evidence. The codebase supersedes this document.

## 1. Architecture Model

- Business domains reside in `layers/<name>/` (`layers/*` workspace), package
  `@nuxfire/layer-<name>`. Existing today: **core** `teams`, `notifications`,
  `admin`; **feature** `kanban`, `billing` (`config.ts`). `billing` moved from
  core to feature in SPEC-0005, once `layers/teams` stopped importing it (a
  base layer must never import a feature layer, enforced by
  `scripts/layer-dependency-direction.test.ts`).
- `apps/app` is the **Composition Root**: application shell (dashboard, account),
  tRPC composition, `nuxt.config.ts`, and core infrastructure
  (`server/utils/{db,auth,audit-log,mfa-crypto,rate-limit,ws-ticket,user-mfa*}.ts`,
  `app/plugins/websockets.client.ts`, `app/composables/use-notification.ts`,
  `app/components/account/MfaSetupModal.vue`,
  `app/middleware/{0.auth,1.teams}.global.ts`). Contains zero business domain logic.
- Other workspace packages: `apps/web` (marketing site + docs), `apps/login` (static login UI),
  `apps/functions` (Workers), `packages/{emails,tokens,manifest}`.

## 2. Where Layers are Registered (`config.ts`)

```ts
export const layers = {
  core: ["teams", "notifications", "admin"] as string[],
  features: { kanban: true, billing: true } as const,
};
```

- **Core vs Feature distinction exists solely for toggleability, never composition.** Both
  feed into `activeLayerNames` (`apps/app/nuxt.config.ts`), which drives `extends`,
  generated tRPC routes, and generated navigation. For a core layer,
  **adding the name to `layers.core` is the entire registration**; no manual imports.
- `layers` governs which Nuxt layers compose into the application; `flags` governs which
  **Cloudflare infrastructure resources** SST provisions. They are separate by design.
- **"Active" has a single source of truth: `activeLayerNames`.** Never determine
  active state merely by presence of `layer.manifest.ts` on disk (real Phase 2 bug:
  with `kanban: false`, pages were stripped but the router remained callable and navigation
  rendered links to non-existent routes). Any code querying active layers receives
  `activeLayerNames` as an explicit parameter.
- `#nuxfire/config` **does not resolve** inside `nuxt.config.ts` (jiti ignores tsconfig
  `paths`): import `config.ts` and `scripts/compose-layers.ts` via relative paths there.

## 3. Generated Composition (`scripts/compose-layers.ts`)

Invoked by `apps/app/nuxt.config.ts` on every `nuxt dev/build/generate/typecheck/prepare`;
`bun scripts/compose-layers.ts` serves solely for inspection. Generates two files —
**never edit manually**:

1. `apps/app/server/trpc/routers/.composition/layer-routers.ts`: layer included if it has
   both `layer.manifest.ts` **and** `server/trpc/router.ts`. Imports
   `routers` from `@nuxfire/layer-<dir>/server/trpc/router`.
2. `apps/app/app/composables/.composition/layer-navigation.ts`: re-exports manifests from each
   active layer (`@nuxfire/layer-<dir>/manifest`) for `useLayerNavigation()`.

Manifest `name` is parsed via **regex** against file content (`name: "…"` literal);
it must be a literal string matching the directory name.

## 4. Anatomy of a Layer (Reference: `layers/kanban`)

| Path | Purpose |
|---|---|
| `package.json` | `name`, `exports`, **explicit** dependencies |
| `nuxt.config.ts` | `$meta.name` + `components: [{ path: "./components" }]` |
| `layer.manifest.ts` | `defineLayerManifest({ name, displayName, description, version, requires, navigation, permissions })` (`@nuxfire/manifest`) |
| `app/` | `components/`, `composables/`, `pages/`, `layouts/`, `middleware/`, `plugins/`, `utils/` |
| `server/trpc/router.ts` | exports `routers` map |
| `server/database/schema.ts` | layer database tables |
| `server/utils/` | server utilities (auto-imported app-wide, see §6) |
| `shared/utils/abilities.ts`, `permissions.ts` | authorization abilities and permission constants |
| `i18n/locales/{en,es,pt-BR}.json` | localized strings |
| `vitest.config.ts`, `vitest.setup.ts` | test configuration (`shared/**` and `server/**`) |

`package.json` `exports` (standardized across `kanban`/`teams`):

```json
".": "./nuxt.config.ts",
"./manifest": "./layer.manifest.ts",
"./server/trpc/router": "./server/trpc/router.ts",
"./server/database/schema": "./server/database/schema.ts",
"./shared/*": "./shared/*.ts"
```

- **`exports["."]` must point to `nuxt.config.ts`, never to the manifest.**
  Pointing to the manifest caused `extends` to evaluate the manifest as Nuxt config:
  no crash occurred, but no layer `nuxt.config.ts` applied (`components.prefix` was inert).
  Manifests reside under `./manifest`.
- Wildcard exports require explicit extensions in targets: `"./shared/*": "./shared/*.ts"`
  (`"./shared/*"` without extension resolves to nothing under `moduleResolution: bundler`).
- Explicitly declare **every package imported by layer code** in the layer's
  `package.json` (`drizzle-orm`, `zod`, `@trpc/server`, `@nuxt/ui`,
  `@nuxfire/functions: workspace:*`, `@nuxfire/layer-teams: workspace:*`…). Never rely on
  transitive dependencies (Bun hoist layouts are not guaranteed).
- Layers **lacking** an `app/` folder cause Nuxt 4 to fall back to layer root, pulling
  all of `server/` into client-side TypeScript compilation: declare `srcDir: "app"` in
  `nuxt.config.ts` while `app/` is absent (remove once created).

## 5. Collision Avoidance (Rules Governing All Layers)

- **Abilities** (`defineAbility`) must carry the **layer prefix**:
  `kanbanListBoards`, `teamsDeleteTeam`. `nuxt-authorization` leverages Nuxt's
  `shared/utils/` auto-import, which operates on a single flat export namespace;
  colliding exports fail silently. The prefix reflects the **layer name**, not the
  permission string. **tRPC procedure keys are never prefixed** (`teams.listMembersAndInvites`
  is public API).
- Import layer abilities via `@nuxfire/layer-<name>/shared/utils/abilities` (`#shared`
  points to the app's `shared/`, never layer files).
- **Components**: registered names derive from **directory + filename**, and directory
  prefixes **de-duplicate** when filenames start identically
  (`notifications/NotificationsSlideover.vue` → `<NotificationsSlideover>`), but
  `components.prefix` **does not** de-duplicate (`prefix: "Kanban"` + `KanbanBoard.vue`
  → `<KanbanKanbanBoard>`). Therefore **no layer defines `prefix`**; only
  `path: "./components"`. Preserve subdirectories when registered names depend on them
  (`admin/plans/CreateEditModal.vue` → `<AdminPlansCreateEditModal>`). Check
  `.nuxt/components.d.ts` before and after moves.
- `path` in `components` resolves against **`srcDir`** (`layers/<x>/app`), not `rootDir`:
  `./components`, never `./app/components`.
- **Global middleware cannot guarantee ordering across layers**: Nuxt orders by name
  only within an individual layer, concatenating layers with the Composition Root **last**.
  Thus `1.teams.global.ts` resides in `apps/app`, executing after `0.auth.global.ts`.
  **Named** middleware (`definePageMeta({ middleware: "invite" })`) always executes after
  all global middleware and safely resides in layers.
- **Plugins** provide an explicit ordering primitive: plugins depending on foreign plugins
  declare `defineNuxtPlugin({ dependsOn: ["websockets"] })`. Relying on filename order
  fails when files move between layers. WebSocket plugins are `.client.ts`; do not remove.
- **Pages and layouts merge seamlessly across layers.** `/{team}/settings` has a parent
  in `layers/teams` and children contributed from three layers. Layer pages can specify
  `layout`/`middleware` from other origins (`layout: "dashboard"` from Composition Root;
  `layout: "admin"` from `layers/admin`). Verify in **build**
  (`dist/server/chunks/virtual/entry.mjs`), not merely `nuxt prepare`.

## 6. Backend Execution in Layers

- The `server/` directory of each layer is **scanned by Nitro**: `server/utils/*.ts`
  become application auto-imports and can invoke `useDB()` (`layers/teams/server/utils/`).
  **tRPC routers do not** depend on auto-imports: they are imported as static modules
  by the composition script and explicitly import `~~/server/trpc/trpc` and `~~/server/utils/db`.
- Database schema: **manual import line** in barrel `apps/functions/src/database/schema.ts`,
  using **package specifiers**, paired with `@nuxfire/layer-<name>: workspace:*` in
  `apps/functions/package.json`. See `$fireskill-specialist-drizzle`.
- Layer dependencies should be declared via package specifiers and documented in
  `requires: [...]` in the manifest. **`requires` is informational**: no tooling validates
  `extends` ordering automatically.
- Per-layer infrastructure (Durable Objects, queues, crons) is **out of scope**: layers
  consume shared infrastructure (Postgres/Hyperdrive, KV, R2). Manifests omit
  `infrastructure` fields.
- Disabling a feature layer does **not** strip its Drizzle client types (barrel imports
  stay unconditional, at no cost — its tRPC router is never mounted, so nothing queries
  those tables). Most layers that own tables also own their **own** independent
  migration history (`layers/<name>/drizzle.config.ts`, `layers/<name>/migrations/`,
  own tracking table) — separate from the base history, which by default only ever
  sees `core-schema.ts` (SPEC-0006, 2026-09-28, replacing the 2026-09-27 design where
  a feature's tables lived in the shared base history and were merely excluded from
  its *next* migration; extended the same day to two `layers.core` layers too —
  `admin`, `notifications`). Whether a layer's history is independent or folded into
  the base is decided per-layer, not by core-vs-feature: any layer whose FK
  relationship to `core-schema.ts` is one-directional (or absent) can split cleanly —
  today that's `admin`, `notifications`, `kanban`, `billing`. `teams` is the one
  exception with its own schema: a real, bidirectional physical FK cycle with
  `core-schema.ts` (`Job`/`DeadLetterRecord` → `Team`, `TeamInvite.invitedById` →
  `User`) means no single cross-history migration ordering can satisfy both
  directions, so it stays folded into the base — see `fireskill-specialist-drizzle`.
  For a **feature** layer specifically, `config.ts`'s `layers.features` additionally
  gates whether that history's migration (`scripts/run-migrations.mjs`, never
  `drizzle-kit migrate`'s own CLI — see `fireskill-specialist-drizzle`) runs at deploy
  time at all (`infra/utils/nuxt.ts`) — "disabled" = omitted from UI **and** its
  migration never applied, so a feature never turned on never has tables in that
  database, not even empty. A **core** layer with its own history (`admin`,
  `notifications`) has no such flag: its migration always runs, only the history
  itself is independent, for the same at-a-glance-clarity reason as feature layers.
  Flipping an already-active feature off does **not** retroactively drop its
  tables (nothing diffs the independent histories against each other); its data is
  simply no longer migrated or seeded going forward. See `fireskill-specialist-drizzle`
  and `apps/functions/src/database/MIGRATIONS.md`.

## 7. Navigation, Permissions, and Localization

- **Navigation**: `navigation.sidebar` in manifest, providing `label`, `icon` (`i-lucide-…`),
  `to` (`{team}` interpolates active tenant slug), and `order`. Layers without menu items
  **omit** `navigation` (`teams`).
- **Permissions**: strings `layer:resource:action` in manifest `permissions`; constants
  mirrored in `shared/utils/permissions.ts`. Live records exist in the `Permission` database
  table (e.g., `ensureKanbanPermissions`). See `$fireskill-specialist-nuxt-authorization`.
- **i18n**: three files per layer (`en`, `pt-BR`, `es`); `en.json` is the source of truth,
  and others must contain **identical key sets**. `bun run check:i18n` fails on mismatched keys.
  The app uses `@nuxtjs/i18n` with `restructureDir: "i18n"`, `strategy: "no_prefix"`,
  locales `en`, `pt-br`, `es`.
- **Testing**: a single `vitest.config.ts` + `vitest.setup.ts` inside the layer suffices;
  the root test runner (`vitest.config.mts`, `test.projects: ["apps/app", "layers/*"]`)
  discovers it automatically. `defineAbility` is a Nuxt auto-import: `vitest.setup.ts`
  assigns it to `globalThis`.

## 8. What Does NOT Exist

- Automated validation of `requires` / `extends` ordering.
- Infrastructure declaration blocks in manifests.
- Test suites for layer tRPC routers or UI components (coverage focuses on billing,
  team seats, and RBAC abilities).
