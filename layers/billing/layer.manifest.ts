import { defineLayerManifest } from "@nuxfire/manifest";

export default defineLayerManifest({
  name: "billing",
  displayName: "Billing",
  description:
    "Assinaturas, planos e catálogo de preços: Stripe/Paddle, webhooks e o console de planos do platform admin",
  version: "1.0.0",

  // Documentational only — nothing validates `extends` order automatically
  // (see nuxfire-layers.md, Fase 1.4). `teams` is listed because
  // `Subscription.teamId` is a real FK to `Team` and this layer imports
  // `@nuxfire/layer-teams/server/database/schema` directly. The reverse edge
  // exists too at the schema level (`Team.planId` -> `Plan`), but it is not
  // listed as a `requires` on the teams manifest: `requires` documents layer
  // dependency direction, and billing is the dependent of the two.
  requires: ["teams"],

  // `navigation` is deliberately absent: billing is reached from the team
  // settings pages and from /admin, never from a top-level sidebar item. (This
  // layer's frontend is still in packages/app — it moves in Fase 3 passo 2b.)

  // Empty on purpose, not an oversight. The one RBAC gate on this domain is
  // `teams:billing:view`, which is already declared by the teams manifest and
  // written into live `Permission` rows under that exact string. Re-declaring
  // it here (or renaming it to `billing:*`) would orphan every existing row for
  // no behavioural gain — so the permission STRING stays teams-owned while the
  // ability FUNCTION that reads it lives here (shared/utils/abilities.ts).
  permissions: [],
});
