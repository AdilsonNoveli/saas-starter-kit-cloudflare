import { defineLayerManifest } from "@nuxfire/manifest";

export default defineLayerManifest({
  name: "teams",
  displayName: "Teams",
  description:
    "Multi-tenancy: equipes, associações, convites e o RBAC por tenant (Role/Permission)",
  version: "1.0.0",

  // Empty on purpose — teams is the base every other layer depends on, so it
  // has nothing of its own to require. (`requires` is documentational; nothing
  // validates `extends` order automatically — see Fase 1.4 of the plan.)
  requires: [],

  // `navigation` is deliberately absent, not an empty sidebar: team settings
  // are reached from the team switcher and the settings pages, never from a
  // top-level nav item. (This layer's frontend is still in packages/app — it
  // moves in Fase 3, passo 1b.)

  permissions: [
    "teams:update",
    "teams:delete",
    "teams:members:list",
    "teams:members:update",
    "teams:members:remove",
    "teams:invite:create",
    "teams:invite:update",
    "teams:invite:delete",
    "teams:billing:view",
  ],
});
