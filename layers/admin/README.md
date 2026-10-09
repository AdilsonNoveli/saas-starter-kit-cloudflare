# `@nuxfire/layer-admin`

The platform-owner console at `/admin`: cross-tenant company management, queue
monitoring and replay, the append-only audit trail, the elevated-MFA gate that
guards all of it, and the `PlatformAdmin`/`AuditLog` tables behind it. **Fourth
and last** of the core-layer extractions in Fase 3 of
`nuxfire-layers.md`, after `teams`, `billing` and `notifications`.

> **Status: complete (Fase 3 passo 4).** Backend and frontend in one step, like
> `notifications` and unlike `teams`/`billing`. No temporary bridge was needed
> and none was left behind: no `srcDir: "app"` line (the `app/` directory exists
> from the first commit), no re-export shim in `apps/app`.

Extracted last on purpose. `admin` is an **aggregation** layer, not a leaf: its
router already imported `adminPlansRouter` from `@nuxfire/layer-billing` and
`adminNotificationsRouter` from `@nuxfire/layer-notifications` before this step,
because passos 2a and 3 deliberately left the `admin.plans` and
`admin.notifications` mount points pointing at the layers that own that logic.
Moving the aggregator into this layer required **zero changes to either import**
— both were already package specifiers, already portable. That is the entire
payoff of the ordering.

## Activation

Core, not toggleable. Registered in the root `config.ts`:

```typescript
export const layers = {
  core: ["teams", "billing", "notifications", "admin"],
  features: { kanban: true },
};
```

That array is the whole registration: `extends`, the generated tRPC composition
and the generated sidebar navigation all read the same `activeLayerNames` set.
With `admin` on it, `layers.core` is complete — `apps/app` is a Composition
Root with no domain logic left in it.

## Layout

| Path                                              | Role                                                                              |
| ------------------------------------------------- | --------------------------------------------------------------------------------- |
| `layer.manifest.ts`                               | identity; `requires: ["notifications", "account"]`, `permissions: []`             |
| `nuxt.config.ts`                                  | `$meta.name` + `components: [{ path: "./components" }]`, no `prefix`, no `srcDir` |
| `server/database/schema.ts`                       | `platform_role` pgEnum, `PlatformAdmin` + relations, `AuditLog`                   |
| `server/trpc/router.ts`                           | exports `routers` = `{ admin }` — the aggregator                                  |
| `server/trpc/admin-teams.ts`                      | `admin.teams.*` — cross-tenant company view, suspend/reactivate                   |
| `server/trpc/admin-queue.ts`                      | `admin.queue.*` — queue stats, dead letters, replay, cron logs                    |
| `server/trpc/admin-audit-log.ts`                  | `admin.auditLog.list` — read-only by construction                                 |
| `server/utils/platform-admin.ts`                  | `findActivePlatformAdmin()` / `isActivePlatformAdmin()`                           |
| `server/utils/platform-mfa-session.ts`            | the sealed 30-minute elevated-session cookie                                      |
| `server/api/admin/mfa/{setup,verify,challenge}.*` | enrolment and re-elevation — Nitro routes, deliberately not tRPC                  |
| `server/api/admin/mfa/status.get.ts`              | read-only state the shell reads on mount                                          |
| `app/layouts/admin.vue`                           | the `admin` layout — badged shell, own sidebar, MFA veil                          |
| `app/middleware/admin.ts`                         | the `admin` **named** middleware — UX gate only                                   |
| `app/pages/admin/*`                               | `/admin`, `/admin/audit-log`, `/admin/companies[/:id]`, `/admin/queue`            |
| `app/components/admin/*`                          | `<AdminDataTable>`, `<AdminCompanies*Modal>`, `<AdminQueueReplayModal>`           |

## Conventions that are not optional

- **This layer's `app/components/` KEEPS its nesting**, like `layers/billing` and
  unlike `layers/teams`/`layers/notifications`. Nuxt's directory-derived prefix
  is what produces two of the four live names —
  `admin/companies/SuspendModal.vue` → `<AdminCompaniesSuspendModal>`,
  `admin/queue/ReplayModal.vue` → `<AdminQueueReplayModal>` — so flattening
  would rename them. (`admin/AdminDataTable.vue` is the stutter case the
  directory prefix de-duplicates on its own: `<AdminDataTable>`, not
  `<AdminAdminDataTable>`.) Rule unchanged: preserve the subpath whenever the
  registered name depends on it. Proven against a real `nuxt build`, not
  assumed — all four chunks carry `__name:"Admin…"` matching their pre-move
  `.nuxt/components.d.ts` entries, with SSR module ids under
  `layers/admin/app/components/`.
- **`layout: "admin"` and `middleware: "admin"` resolve cross-layer BY NAME, in
  the direction this migration had not tested before.** Every prior case was a
  page in a layer referencing a layout/middleware that stayed in the Composition
  Root. Here the layout and the middleware moved **into** a layer while pages in
  two **other** layers keep naming them: `layers/billing/app/pages/admin/plans/index.vue`
  and `layers/notifications/app/pages/admin/notifications.vue` were not edited by
  this extraction. It works because Nuxt merges layouts and named middleware into
  one flat, app-wide registry before any page resolves a name. Proven in the
  built bundle: the layouts map is `{dashboard, page, admin}` with `admin` →
  a chunk whose source map names `layers/admin/app/layouts/admin.vue`, and the
  named-middleware map is `{admin, invite}` with `admin` →
  `layers/admin/app/middleware/admin.ts`; the `/admin/plans` and
  `/admin/notifications` route records (whose page chunks map back to
  `layers/billing` and `layers/notifications`) carry exactly that
  `layout:"admin"`, `middleware:"admin"` meta.
- **`admin.ts` is NAMED middleware, which is why it may live here at all.** Only
  `*.global.*` middleware has the cross-layer ordering problem (layers are
  concatenated with the Composition Root last, so a layer's global middleware
  can never run after `0.auth.global.ts` — see `nuxfire-layers.md` and why
  `1.teams.global.ts` stays in `apps/app`). Named middleware always runs
  after every global one. Confirmed unchanged in the build: the global array is
  still `[<teams store init>, 0.auth.global, 1.teams.global, <noop>]` and gained
  nothing from this layer.
- **`server/trpc/router.ts` exports the `routers` map, and that is the point of
  the file.** Until this step the aggregator was a bare default export that
  `apps/app/server/trpc/routers/index.ts` imported by hand
  (`import admin from "./admin"`) — the last hardcoded layer-ish import in the
  Composition Root, and the one remaining exception to "core layers and feature
  layers are the same mechanism". It now flows through the generated
  `.composition/layer-routers.ts` like every other layer. Verified in the built
  bundle: `{admin: router({teams, plans, queue, auditLog, notifications})}` is
  this layer's `routers`, and `appRouter` is
  `router({account, public, ...{...{admin}, ...{billing,stripe}, ...{kanban}, ...{notifications}, ...{teams,invites}}})`
  — `admin` moved from a literal key into the spread, with every client-facing
  path (`trpc.admin.teams.*`, `trpc.admin.plans.*`, `trpc.admin.queue.*`,
  `trpc.admin.auditLog.*`, `trpc.admin.notifications.*`) byte-identical.
- **This extraction introduced NO schema import cycle — the first one here that
  did not.** `server/database/schema.ts` imports `users` from
  `@nuxfire/functions/database/core-schema` and core imports nothing back:
  grepping `core-schema.ts` for `platformAdmins`/`auditLogs` after the move
  returns only a prose comment, no code. That is because nothing in core ever
  referenced either table — `usersRelations` declares only `notifications`, and
  `AuditLog.actorUserId` is deliberately not a foreign key. Do not "restore
  symmetry" with a `platformAdmin` relation on `usersRelations`: it would
  manufacture a fourth cycle for no behavioural gain.
- **Package specifier, never a relative path**, in both this layer's schema file
  and the barrel line it added to `apps/functions/src/database/schema.ts`.
  A relative path resolves fine under tsc, vitest, drizzle-kit, `nuxt build` and
  plain `esbuild --bundle` — none of which is SST's own Worker bundler, the one
  that actually ships `apps/functions`. Real deploy failure, d0dac0a; see
  `nuxfire-layers.md`. Gate used here in place of a live deploy:
  `bunx esbuild apps/functions/src/{cron,jobs-consumer,dlq-consumer}.ts --bundle --platform=node`,
  each individually, grepped for `Could not resolve` — zero, and
  `layers/admin/server/database/schema.ts` is present in the resulting bundle.
- **`Job`, `Log` and `DeadLetterRecord` did NOT move with `admin-queue.ts`.**
  They are generic async-job-processing infrastructure written by
  `apps/functions/src/{jobs-consumer,dlq-consumer}.ts`, not admin-domain
  data. This layer only reads them, through the `@nuxfire/functions/schema`
  barrel — same reasoning that kept them in core through every prior extraction.
- **What this layer shares with the regular-user MFA lives elsewhere.**
  The AES-GCM for TOTP seeds, shared by `PlatformAdmin.mfaSecret` **and**
  `User.mfaSecret`, is `encryptSecret`/`decryptSecret` from `@nuxfire/crypto`
  (`packages/crypto`), and the recovery-code database functions come from
  `@nuxfire/layer-account/server/utils/mfa-recovery`; both are explicit
  imports since SPEC-0009, as is the rate limit, taken from the app's single
  wrapper `~~/server/utils/rate-limit`.
  `<AccountMfaSetupModal>` and `<AccountMfaRecoveryPanel>` now live in
  `layers/account/app/components/account/` and take a `scope` prop that serves
  both the admin and the regular-user flows — `app/layouts/admin.vue` and
  `app/pages/admin/index.vue` here keep referencing them by name, cross-layer,
  with no import. `server/utils/audit-log.ts` stayed in `apps/app` on purpose:
  it holds `recordAuditLog()`, which the Composition Root's own
  `platformAdminProcedure` middleware calls as its safety net and which
  `layers/billing` and `layers/account` also import.
- **`requires: ["notifications", "account"]`, and `teams` and `billing` are
  deliberately absent.** `notifications` is a real import edge in
  `server/trpc/router.ts`; `account` is one in the MFA routes
  (`@nuxfire/layer-account/server/utils/mfa-recovery`) and the console renders
  its components. The billing-aware admin routers are assembled by the
  Composition Root (see the comment in `layer.manifest.ts`).
  `admin-teams.ts` queries `teams`/`teamMemberships`/`plans`/`subscriptions`
  through the `@nuxfire/functions/schema` aggregator barrel and never imports
  `@nuxfire/layer-teams`, so listing it would be a claim the source does not
  support — same reasoning as the notifications manifest.
- **No `defineAbility()`, no permission strings, on purpose.**
  `platformAdminProcedure` is built on `protectedProcedure`, **never** on
  `abilityProcedure`: platform authority is a parallel system to tenant RBAC,
  and routing it through the ability layer is exactly how a tenant-scoped
  permission could grant platform access. Its three gates (active
  `PlatformAdmin` row, MFA enrolled, elevated session under 30 minutes old)
  moved byte-for-byte. Two roles exist (`SUPER_ADMIN`, `SUPPORT`) and are still
  not differentiated in logic — that is a known gap, not something to
  "complete" while relocating.
- **Moving a `pgTable` between files generates no migration.** This extraction
  produced `"No schema changes, nothing to migrate"` at 20 tables, with
  `PlatformAdmin` still 7 columns / 1 fk and `AuditLog` still 8 columns / 0 fks.
  If a relocation ever produces a migration, a column definition changed by
  accident.

## Tests

This layer ships **none**, and neither did the domain before the move — the
suite count is unchanged at 7 files / 131 tests. There is no `vitest.config.ts`
here; the root aggregator's `layers/*` project glob tolerates a layer without
one.

Typechecking is `bun run typecheck` in `apps/app` for the client program,
plus `bunx vue-tsc --noEmit -p server/tsconfig.json` for the server program —
`nuxt typecheck` does **not** cover the latter, which is the half that contains
every layer's `server/**`.
