# `@nuxfire/layer-billing`

Subscriptions, plans and the price catalog: Stripe/Paddle checkout and portal,
both payment webhooks, and the platform-admin plan console. Second of the four
core-layer extractions in Fase 3 of `_docs/REFATORE_ARCHITETURE.md`, after
`teams` and before `notifications`/`admin`.

> **Status: complete (Fase 3 passo 2a backend + 2b frontend).** Schema, tRPC
> routers, server utils, Nitro webhook routes, enums, the billing ability **and**
> the whole billing frontend (`app/pages/[[team]]/settings/billing.vue`,
> `app/pages/admin/plans/index.vue`, `app/components/{billing,pricing,admin/plans}/**`,
> `usePayments()`, `useGetBillingInfoAbility()`) live here.
>
> Both temporary bridges passo 2a left behind are closed: the re-export at the
> bottom of `packages/app/types/enums.ts` is deleted (its last two importers
> moved here), and `srcDir: "app"` is gone from `nuxt.config.ts` now that
> `app/` actually exists and the Nuxt 4 default resolves to it — confirmed by
> `packages/app/.nuxt/tsconfig.json` including `layers/billing/app/**/*`, not
> `layers/billing/**/*`.

## Activation

Core, not toggleable — every tenant of this SaaS needs billing. Registered in
the root `config.ts`:

```typescript
export const layers = {
  core: ["teams", "billing"],
  features: { kanban: true },
};
```

That array is the whole registration: `extends`, the generated tRPC composition
and the generated sidebar navigation all read the same `activeLayerNames` set.

## Layout

| Path                                   | Role                                                                                   |
| -------------------------------------- | -------------------------------------------------------------------------------------- |
| `layer.manifest.ts`                    | identity; `requires: ["teams"]`; `permissions: []` — see below                          |
| `nuxt.config.ts`                       | `$meta.name` + `components: [{ path: "./components" }]`, no `prefix`, no `srcDir`        |
| `app/pages/[[team]]/settings/billing.vue` | the `/{team}/settings/billing` tab — a child of the settings parent in `layers/teams` |
| `app/pages/admin/plans/index.vue`      | `/admin/plans`, the platform-admin plan console (`layout`/`middleware` named `admin`)    |
| `app/components/admin/plans/CreateEditModal.vue` | `<AdminPlansCreateEditModal>` — the subpath IS the name, see below            |
| `app/components/billing/*.vue`         | `<BillingComparisonTable>`, `<BillingPeriodToggle>`, `<BillingPortalActions>`, `<BillingTrialBanner>` |
| `app/components/pricing/PricingCard.vue` | `<PricingCard>`, used by the admin plan modal's preview                                |
| `app/composables/use-payments.ts`      | `usePayments("PADDLE" \| "STRIPE")` — client-side checkout for both providers            |
| `app/composables/use-ability.ts`       | `useGetBillingInfoAbility()` — wrapper for this layer's ability; see below               |
| `server/database/schema.ts`            | `Plan`, `Benefit`, `BenefitsOnPlan`, `Subscription` + their relations                   |
| `server/trpc/router.ts`                | exports `routers` = `{ billing, stripe }`, **plus** `adminPlansRouter` as a named export |
| `server/trpc/billing.ts`               | `billingRouter` — `getBillingInfo` (plans, current subscription, portal links)          |
| `server/trpc/stripe.ts`                | `stripeRouter` — `createStripeCheckoutSession`                                          |
| `server/trpc/admin-plans.ts`           | `adminPlansRouter` — Plan CRUD + Stripe catalog sync, mounted at `admin.plans`           |
| `server/api/webhooks/stripe.post.ts`   | `POST /api/webhooks/stripe` — verify → dedupe → dispatch                                |
| `server/api/webhooks/paddle.post.ts`   | `POST /api/webhooks/paddle` — same shape                                                 |
| `server/utils/stripe.ts`               | `createStripeClient()` — pins the Stripe API version                                    |
| `server/utils/stripe-catalog.ts`       | Product/Price create-update-archive against Stripe                                      |
| `server/utils/stripe-portal.ts`        | the restricted "Cancel Subscription" portal configuration + its KV key                  |
| `server/utils/stripe/status-map.ts`    | exhaustive `Stripe.Subscription.Status` → `SubscriptionStatus` (+ its test)             |
| `server/utils/stripe/subscription-sync.ts` | the canonical handler behind every Stripe subscription event                        |
| `server/utils/billing/event-ledger.ts` | shared Stripe/Paddle webhook idempotency ledger in KV (+ its test)                      |
| `server/utils/billing/subscription-repository.ts` | the single `upsertSubscription()` write path for both providers (+ its test)  |
| `server/utils/plans.ts`                | `ensureFreePlan()`/`addPlan()` — the reactive Free-plan safety net                       |
| `shared/types/enums.ts`                | `SubscriptionStatus`, `PaymentProvider`, `STRIPE_PLAN_CURRENCIES`, `PLAN_BILLING_INTERVALS` |
| `shared/utils/abilities.ts`            | `billingGetBillingInfo` (+ its test)                                                    |

## Conventions that are not optional

- **This layer KEEPS its component subdirectories; `layers/teams` flattened its
  own for a reason that does not apply here.** Teams merged `components/team/`
  and `components/members/` into one flat directory because Nuxt's
  directory-nesting auto-prefix would have stuttered names that already began
  with the directory's word (`team/TeamSwitcher.vue` → `<TeamTeamSwitcher>`).
  Here the nesting is what *produces* the live name:
  `admin/plans/CreateEditModal.vue` registers as `<AdminPlansCreateEditModal>`,
  which is exactly how `app/pages/admin/plans/index.vue` calls it — flattening
  the directory would rename the component. `billing/` and `pricing/` are
  redundant for naming (their filenames already carry the name) but were left
  untouched: this was a relocation, not a restructure. Proven against a real
  `nuxt build`, not assumed — the emitted chunks carry
  `__name:"AdminPlansCreateEditModal"` on the component whose SSR module id is
  `layers/billing/app/components/admin/plans/CreateEditModal.vue`, and all six
  names are byte-identical to their pre-move entries in
  `packages/app/.nuxt/components.d.ts`.
- **`useGetBillingInfoAbility` lives in `app/composables/use-ability.ts` here,
  but its only caller is in `layers/teams`.** It wraps `billingGetBillingInfo`,
  so it follows the ability by domain ownership;
  `layers/teams/app/composables/use-team-settings-links.ts` (which decides
  whether the Billing settings tab renders) imports it explicitly as
  `@nuxfire/layer-billing/app/composables/use-ability`, the same shape as the
  `@nuxfire/layer-billing/shared/utils/abilities` import passo 2a introduced.
  That is what the `"./app/*": "./app/*.ts"` entry in this layer's `exports`
  exists for — note the `.ts` on the target, without which the subpath resolves
  to nothing under `moduleResolution: bundler`.
- **The settings route family is contributed by THREE layers.** One parent
  (`layers/teams/app/pages/[[team]]/settings.vue`) with five children:
  `index`/`members`/`security` from `layers/teams`, `notifications` from
  `layers/notifications` (it lived in `packages/app` until Fase 3 passo 3), and
  `billing` from here.
  Verified in the built route manifest, not assumed — two-way page-tree merging
  working did not guarantee three-way would.
- **`adminPlansRouter` is exported from `server/trpc/router.ts` but is NOT in the
  `routers` map.** `routers` is spread into `appRouter` at the **top level**, so
  putting it there would republish a live `trpc.admin.plans.listPlans` call as
  `trpc.plans.listPlans`. Its content is billing-domain (Plan/Benefit CRUD,
  Stripe catalog sync — merely `platformAdminProcedure`-gated, not admin-domain
  logic), but its mount point belongs to
  `@nuxfire/layer-admin/server/trpc/router`, which imports it from here by name
  and keeps it at `admin.plans`. (That aggregator was
  `packages/app/server/trpc/routers/admin/index.ts` until Fase 3 passo 4 moved
  it into `layers/admin`; the import needed no change, because it was always a
  package specifier.) Extracting a domain must never reshape the public API.
- **This layer's schema and `layers/teams`' schema import each other.** The
  second deliberate cycle in this codebase, after `core-schema.ts` ↔
  `layers/teams`. `Subscription.teamId` → `Team` here; `Team.planId` and
  `teamRelations`' `plan`/`subscriptions` → `Plan`/`Subscription` there. Safe
  only because every cross-boundary reference sits inside a Drizzle callback
  (`.references(() => teams.id)`, `relations(t, ({ one }) => ...)`) — nothing may
  read an imported binding at module top level in either file, or the cycle
  becomes a TDZ crash at import time. It is mirrored by a workspace dependency
  cycle in the two `package.json`s, which Bun resolves as plain symlinks.
  `core-schema.ts` is **not** part of this cycle: nothing left in it references
  `Plan`/`Subscription`, so it no longer imports them.
- **The tRPC routers cross package boundaries by explicit import**
  (`~~/server/trpc/trpc`, `~~/server/utils/db`, `~~/server/utils/audit-log`).
  They are imported as plain modules by the generated
  `.composition/layer-routers.ts`. `hubKV()` and `getRequestIP()` stay bare —
  they are module-less globals (a NuxtHub module auto-import and an h3 one),
  the same category as `hubBlob()` in `layers/teams/server/trpc/teams.ts`.
- **`server/utils/*.ts` deliberately do NOT do that.** They still call `useDB()`
  and `hubKV()` as bare Nitro auto-imports, exactly as they did inside
  `packages/app` — Nitro's scan covers every active layer's `server/` dir. They
  were relocated byte-for-byte on purpose (only `~~/...` specifiers were
  rewritten to relative ones), so the three suites that stub those globals still
  prove the move changed nothing.
- **The webhook URLs are a contract with Stripe and Paddle.** `/api/webhooks/stripe`
  and `/api/webhooks/paddle` are configured in those providers' dashboards and
  cannot move. Nitro merges `server/api/` across layers by relative path, so the
  files living here changes nothing — verified against a real `nuxt build`, not
  assumed: `dist/server/chunks/_/nitro.mjs` carries
  `route:"/api/webhooks/stripe", ..., method:"post"` and the paddle twin.
- **`permissions: []` in the manifest is intentional.** The one RBAC gate on this
  domain is `teams:billing:view` — already declared by the teams manifest and
  already written into live `Permission` rows. The permission STRING stays
  teams-owned; only the ability FUNCTION reading it lives here, named
  `billingGetBillingInfo` per the layer-prefix rule (the prefix is the layer's,
  not the permission's).
- **`Plan`s are DB rows, not a hardcoded object.** Only the Free plan is seeded
  (`packages/functions/src/database/seed-data.ts`); everything else is created by
  the platform owner at `/admin/plans`. Do not reintroduce a plan constant.
- **Moving a `pgTable` between files generates no migration.** drizzle-kit diffs
  table/column identity against the snapshot, not the source file. This whole
  extraction produced `"No schema changes, nothing to migrate"` at 20 tables. If
  a relocation ever produces a migration, a column definition changed by
  accident — find it before going further, `Plan` and `Subscription` hold live
  money data.

## Tests

Run under the root aggregator (`vitest.config.mts` →
`test.projects: ["packages/app", "layers/*"]`):

```bash
bun run test            # from the repo root
```

Typechecking is `bun run typecheck` in `packages/app`: Nuxt puts every active
layer's `server/**` and `shared/**` into the app's tsconfig program, so this
layer has no typecheck script of its own. Note that `nuxt typecheck` checks the
**app** program only — `packages/app/server/tsconfig.json` (which is what covers
every layer's `server/**`) has to be run separately with
`bunx vue-tsc --noEmit -p server/tsconfig.json` if you want that half checked.
