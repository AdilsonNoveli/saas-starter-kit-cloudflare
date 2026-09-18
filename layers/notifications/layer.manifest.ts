import { defineLayerManifest } from "@nuxfire/manifest";

export default defineLayerManifest({
  name: "notifications",
  displayName: "Notifications",
  description:
    "Notificações in-app: a tabela Notification, o sino do dashboard, a preferência por usuário e o push em tempo real sobre WebSockets",
  version: "1.0.0",

  // Empty, and that is what the code actually says — not an oversight.
  //
  // `nuxfire-layers.md` (Fase 3, item 3) predicted this layer would
  // depend on `teams`. It does not: `Notification` has exactly one cross-table
  // reference, `userId` -> `User`, which lives in `packages/functions`
  // core-schema, and no file in this layer imports `@nuxfire/layer-teams` at
  // all. The only
  // teams-shaped coupling is in `app/pages/admin/notifications.vue`, which CALLS
  // `trpc.admin.teams.*` at runtime to populate its team/member pickers — and
  // that router lives in the admin layer
  // (`layers/admin/server/trpc/admin-teams.ts` since Fase 3 passo 4; it was
  // `packages/app/server/trpc/routers/admin/teams.ts` when this was written),
  // not in the teams layer.
  // A runtime tRPC call is not a layer dependency; `requires` documents the
  // `extends`/import direction, so listing `teams` here would be a claim the
  // source does not support.
  requires: [],

  // `navigation` is deliberately absent: this layer's entry points are the bell
  // in the dashboard layout (a component, not a sidebar route), the
  // account-settings tab and `/admin/notifications` — never a top-level sidebar
  // item.

  // No RBAC permission strings and no `defineAbility()` anywhere in this layer.
  // The tenant router is `protectedProcedure` + an ownership filter on
  // `notifications.userId` (a user only ever reads/writes their own rows), and
  // the cross-domain admin router is `platformAdminProcedure`, which is platform
  // authority and never routes through the tenant ability layer. Do not invent a
  // `notifications:*` permission to "complete" this list — see
  // nuxfire-authorization.md.
  permissions: [],
});
