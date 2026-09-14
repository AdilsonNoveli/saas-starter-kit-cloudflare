# `@nuxfire/layer-notifications`

In-app notifications: the `Notification` table, the tenant list/create/mark-read
API, the bell slideover in the dashboard shell, the per-user "receive
notifications" preference, the real-time push that feeds them, and the
platform-admin console that demonstrates the whole pipeline end to end. Third of
the four core-layer extractions in Fase 3 of `_docs/REFATORE_ARCHITETURE.md`,
after `teams` and `billing` and before `admin`.

> **Status: complete (Fase 3 passo 3).** Unlike `teams` and `billing`, this
> domain moved backend **and** frontend in a single step — ~580 lines total, the
> same scope class as one of those layers' two steps. No temporary bridge was
> needed and none was left behind: no `srcDir: "app"` line (the `app/` directory
> exists from the first commit), no re-export shim in `packages/app`.

## Activation

Core, not toggleable. Registered in the root `config.ts`:

```typescript
export const layers = {
  core: ["teams", "billing", "notifications"],
  features: { kanban: true },
};
```

That array is the whole registration: `extends`, the generated tRPC composition
and the generated sidebar navigation all read the same `activeLayerNames` set.

## Layout

| Path                                            | Role                                                                                       |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `layer.manifest.ts`                             | identity; `requires: []` and `permissions: []` — both deliberate, see below                |
| `nuxt.config.ts`                                | `$meta.name` + `components: [{ path: "./components" }]`, no `prefix`, no `srcDir`          |
| `server/database/schema.ts`                     | `Notification` (pgTable `"Notification"`) + `notificationRelations`                        |
| `server/trpc/router.ts`                         | exports `routers` = `{ notifications }`, **plus** `adminNotificationsRouter` by name       |
| `server/trpc/notifications.ts`                  | `notificationsRouter` — `list` / `create` / `updateReadStatus`, all user-scoped            |
| `server/trpc/admin-notifications.ts`            | `adminNotificationsRouter` — `send`, mounted at `admin.notifications`                      |
| `app/components/NotificationsSlideover.vue`     | `<NotificationsSlideover>` — the bell panel, rendered by `packages/app`'s dashboard layout |
| `app/composables/use-notifications-store.ts`    | `useNotificationsStore()` — the Pinia store behind the bell and its unread badge           |
| `app/plugins/ws-notifications.client.ts`        | subscribes to the user's WS topic and pushes arrivals into the store                       |
| `app/pages/account-settings/notifications.vue`  | `/account-settings/notifications` — the real preference toggle                             |
| `app/pages/[[team]]/settings/notifications.vue` | `/{team}/settings/notifications` — a `redirect:` stub to the page above                    |
| `app/pages/admin/notifications.vue`             | `/admin/notifications` — the platform-admin send console (`layout`/`middleware: "admin"`)  |

## Conventions that are not optional

- **This layer's `app/components/` is FLAT, and that is what preserved the
  name.** The file lived at
  `packages/app/app/components/notifications/NotificationsSlideover.vue` and
  registered as `<NotificationsSlideover>` — Nuxt's **directory**-based
  auto-prefix de-duplicates a segment the filename already repeats, so the
  `notifications/` folder contributed nothing to the registered name. (The
  `prefix` **option** does _not_ de-duplicate — that is the f27adc9 finding, and
  the reason no layer here sets it.) Flattening therefore kept the name
  byte-identical, which is the only thing that mattered:
  `packages/app/app/layouts/dashboard.vue` renders `<NotificationsSlideover />`
  by name and was **not edited by this extraction** (`git diff` on it is empty).
  Contrast `layers/billing`, which keeps `admin/plans/` because there the
  nesting is what produces `<AdminPlansCreateEditModal>`. Rule unchanged:
  preserve the subpath whenever the registered name depends on it. Proven by
  diffing `packages/app/.nuxt/components.d.ts` before and after, and against a
  real `nuxt build` — the emitted chunk carries `__name:"NotificationsSlideover"`
  on the component whose SSR module id is
  `layers/notifications/app/components/NotificationsSlideover.vue`.
- **`adminNotificationsRouter` is exported from `server/trpc/router.ts` but is
  NOT in the `routers` map.** `routers` is spread into `appRouter` at the **top
  level**, so putting it there would republish `trpc.admin.notifications.send`
  as `trpc.notifications.send` — which would additionally collide with this
  layer's own `notifications` key. Its content is Notification-domain logic
  (insert a row, push it over the WebSocket) that merely happens to be
  `platformAdminProcedure`-gated, but its mount point belongs to
  `@nuxfire/layer-admin/server/trpc/router`, which imports it from here by name
  and keeps it at `admin.notifications`. (That aggregator was
  `packages/app/server/trpc/routers/admin/index.ts` until Fase 3 passo 4 moved
  it into `layers/admin`; the import needed no change, because it was always a
  package specifier.) Same shape `layers/billing` uses for `adminPlansRouter`.
  Verified in the built bundle, not assumed: the admin router literal is
  `{teams,plans,queue,auditLog,notifications}` and the top-level one was
  `{account,public,admin,...{billing,stripe},...{kanban},...{notifications},...{teams,invites}}`
  at the time — after passo 4 `admin` moved inside the spread, to
  `{account,public,...{{admin},{billing,stripe},{kanban},{notifications},{teams,invites}}}`,
  with every client-facing path unchanged.
- **This layer's schema and `packages/functions`' `core-schema.ts` import each
  other.** The THIRD deliberate cycle in this codebase, after
  `core-schema.ts` ↔ `layers/teams` and `layers/teams` ↔ `layers/billing`.
  `notificationRelations`' join to `User` here; `usersRelations`'
  `notifications: many(notifications)` → back here from there. Note this is a
  Drizzle **relation**, not a database foreign key: `Notification.userId` is a
  bare `text()` with no `.references(...)`, which is why drizzle-kit reports
  `Notification ... 0 fks` both before and after the move. Safe only because
  both cross-boundary references sit inside a `relations(...)` callback body, so
  neither file reads an imported binding at module top level. **Both directions use a package
  specifier** (`@nuxfire/functions/database/core-schema` here,
  `@nuxfire/layer-notifications/server/database/schema` there) — never a
  relative path. That is not style: a relative path in `core-schema.ts` or the
  schema barrel breaks a real `sst deploy` and nothing short of one catches it
  (d0dac0a; see `_docs/AGENTS.md`).
- **Two notification-adjacent files deliberately stayed in `packages/app`.**
  `app/composables/use-notification.ts` is a naming trap — despite the name it
  is a generic `useToast()` wrapper (success/error/info) with nothing to do with
  the `Notification` entity or the bell; it mirrors the composable of the same
  name in `packages/auth-frontend`. And `app/plugins/websockets.client.ts` is
  the **generic** WebSocket transport (topic pub/sub, provides `$ws`) —
  cross-cutting real-time infrastructure, not notifications-domain logic. Fase 4
  of the plan lists a future `layer-chat` that also needs real-time, which is
  precisely why the transport stays centralized while only the domain glue
  (`ws-notifications.client.ts`) lives here.
- **Plugin declaration order flipped across the layer boundary, and `dependsOn`
  is what absorbs it.** Nuxt concatenates plugins with the Composition Root
  **last**, the same collection order that makes global middleware unorderable
  across layers (see `_docs/AGENTS.md`). So `ws-notifications` now appears
  _before_ `websockets` in the registration list, where it used to come after.
  It still runs after, because `defineNuxtPlugin({ dependsOn: ["websockets"] })`
  makes Nuxt defer it — verified in the shipped client bundle, not assumed: the
  plugin object keeps `dependsOn:["websockets"]` and the runtime's
  deferral branch (`if(l.length>0)r.push([new Set(l),c])` in
  `applyPluginsWithDependencies`) is present and not tree-shaken. **Never drop
  that `dependsOn`**, and never remove the `.client` suffix — the setup reads
  `$ws` and `localStorage`.
- **No `defineAbility()`, no permission strings, on purpose.** The tenant router
  is `protectedProcedure` filtered by `notifications.userId` — ownership is the
  entire authorization model, so there is nothing for an ability to decide. The
  admin router is `platformAdminProcedure`, which is platform authority and must
  never route through the tenant ability layer. Do not invent a
  `notifications:*` permission to fill the empty manifest arrays.
- **`requires: []`, even though the plan predicted `teams`.** Nothing here
  imports `@nuxfire/layer-teams`: `Notification` has exactly one FK and it
  points at `User`, in core. The only teams-shaped coupling is
  `app/pages/admin/notifications.vue` _calling_ `trpc.admin.teams.*` at runtime
  to fill its pickers — and that router lives in the Composition Root, not in
  the teams layer. A runtime tRPC call is not a layer dependency.
- **Moving a `pgTable` between files generates no migration.** drizzle-kit diffs
  table/column identity against the snapshot, not the source file. This
  extraction produced `"No schema changes, nothing to migrate"` at 20 tables,
  with `Notification` still reported as 7 columns / 0 fks. If a relocation ever
  produces a migration, a column definition changed by accident.

## Tests

This layer ships **none**, and neither did the domain before the move — it had
zero test files in `packages/app` and still has zero here (the suite count is
unchanged at 7 files / 131 tests). There is no `vitest.config.ts` in this
directory; the root aggregator's `layers/*` project glob tolerates a layer
without one.

Typechecking is `bun run typecheck` in `packages/app` for the client program,
plus `bunx vue-tsc --noEmit -p server/tsconfig.json` for the server program —
`nuxt typecheck` does **not** cover the latter, which is the half that contains
every layer's `server/**`.
