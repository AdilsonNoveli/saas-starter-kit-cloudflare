import { defineLayerManifest } from "@nuxfire/manifest";

export default defineLayerManifest({
  name: "admin",
  displayName: "Platform Admin",
  description:
    "Platform-owner console: cross-tenant view of companies, job queue monitoring, audit trail and the elevated-MFA gate of /admin",
  version: "1.0.0",

  // Documentational only — nothing validates `extends` order automatically
  // (see nuxfire-layers.md, Fase 1.4).
  //
  // `server/trpc/router.ts` imports `adminNotificationsRouter` from
  // `@nuxfire/layer-notifications/server/trpc/router` — notifications-domain
  // logic that is merely admin-*gated*, mounted here under
  // `admin.notifications`, the path the client already calls.
  //
  // `billing` is deliberately NOT listed any more (SPEC-0005): this layer is
  // base (`config.ts`'s `layers.core`) and must never import a feature layer.
  // `admin.plans`/`admin.pendingPurchases` (from billing) and the billing-aware
  // `admin.teams` (plan/subscription columns) are now assembled by the
  // Composition Root (`apps/app/server/trpc/routers/admin-teams-billing.ts`
  // and `routers/index.ts`), which replaces this layer's base `teams` router
  // and adds those two keys only when `layers.features.billing` is true — no
  // file in `layers/admin` imports `@nuxfire/layer-billing` any more, enforced
  // by `scripts/layer-dependency-direction.test.ts`.
  //
  // `teams` is deliberately NOT listed either: `server/trpc/admin-teams.ts`
  // queries `teams`/`teamMemberships`/`jobs` through the
  // `@nuxfire/functions/schema` aggregator barrel, never through
  // `@nuxfire/layer-teams` directly.
  //
  // `account` (SPEC-0009): the MFA routes import the recovery-code functions
  // from `@nuxfire/layer-account/server/utils/mfa-recovery`, and the console
  // renders `<AccountMfaSetupModal>`, `<AccountMfaRecoveryPanel>` and
  // `<AccountUserDropdown>` from that layer.
  requires: ["notifications", "account"],

  // `navigation` is deliberately absent. This layer's sidebar is its own —
  // `app/layouts/admin.vue` builds the `/admin/*` menu inline — and the tenant
  // sidebar that `useLayerNavigation()` feeds must never gain an `/admin` entry
  // for every user. The only tenant-side entry point into the console is the
  // account dropdown, which is gated on the session's `isPlatformAdmin` flag.

  // Empty on purpose, not an oversight. Platform authority is a parallel system
  // to the per-team RBAC and deliberately never routes through it:
  // `platformAdminProcedure` is built on `protectedProcedure`, never on
  // `abilityProcedure`, and there is no `defineAbility()` anywhere in this
  // layer. Inventing an `admin:*` permission string here would put platform
  // access behind a tenant-scoped `Permission` row — precisely the escalation
  // path the split exists to prevent. See nuxfire-authorization.md.
  permissions: [],
});
