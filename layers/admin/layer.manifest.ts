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
  // These two are real import edges, not guesses: `server/trpc/router.ts` here
  // imports `adminPlansRouter` from `@nuxfire/layer-billing/server/trpc/router`
  // and `adminNotificationsRouter` from
  // `@nuxfire/layer-notifications/server/trpc/router`. Those two routers are
  // billing-/notifications-domain logic that is merely admin-*gated*, so they
  // live in their own layers and are mounted here, under `admin.plans` and
  // `admin.notifications` — the paths the client already calls. That is why
  // `admin` is the LAST extraction of Fase 3: it is an aggregation layer, not a
  // leaf, and extracting it earlier would have meant rewriting those imports
  // twice.
  //
  // `teams` is deliberately NOT listed, and that is what the code says.
  // `server/trpc/admin-teams.ts` queries `teams`/`teamMemberships`/`plans`/
  // `subscriptions` through the `@nuxfire/functions/schema` aggregator barrel,
  // never through `@nuxfire/layer-teams` directly — same reasoning the
  // notifications manifest spells out: `requires` documents the import
  // direction, and no file in this layer imports that package.
  requires: ["billing", "notifications"],

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
