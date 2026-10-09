import { defineLayerManifest } from "@nuxfire/manifest";
import { PERMISSIONS } from "@nuxfire/layer-teams/shared/utils/permissions";

export default defineLayerManifest({
  name: "billing",
  displayName: "Billing",
  description:
    "Subscriptions, plans and price catalog: Stripe/Paddle, webhooks and the platform admin plans console",
  version: "1.0.0",

  // Documentational only — nothing validates `extends` order automatically
  // (see nuxfire-layers.md, Fase 1.4). `teams` is listed because this layer
  // imports `@nuxfire/layer-teams/server/database/schema` directly (schema
  // relations, see nuxfire-drizzle.md) and `shared/utils/permissions` (below).
  // The reverse edge (`teams` reaching into `billing`) no longer exists as of
  // SPEC-0005 — a base layer must never import a feature layer.
  requires: ["teams"],

  // `navigation` (top-level sidebar) is deliberately absent: billing is
  // reached from the team settings pages and from /admin, never from a
  // top-level sidebar item.
  //
  // `teamSettingsTabs` is how billing reaches the team settings page instead
  // (SPEC-0005): `layers/teams/app/composables/use-team-settings-links.ts`
  // reads this generically from every active layer's manifest and checks
  // `permission` via the generic `teamsHasPermission` ability — teams never
  // imports billing's own `useGetBillingInfoAbility` (removed).
  teamSettingsTabs: [
    {
      label: "Billing",
      icon: "i-ph-credit-card-duotone",
      to: "/settings/billing",
      permission: PERMISSIONS.TEAMS.BILLING.VIEW,
      order: 30,
    },
  ],

  // Empty on purpose, not an oversight. The one RBAC gate on this domain is
  // `teams:billing:view`, which is already declared by the teams manifest and
  // written into live `Permission` rows under that exact string. Re-declaring
  // it here (or renaming it to `billing:*`) would orphan every existing row for
  // no behavioural gain — so the permission STRING stays teams-owned while the
  // ability FUNCTION that reads it lives here (shared/utils/abilities.ts).
  permissions: [],
});
