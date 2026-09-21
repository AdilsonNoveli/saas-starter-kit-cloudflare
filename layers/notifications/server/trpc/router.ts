import type { AnyRouter } from "@trpc/server";
import { notificationsRouter } from "./notifications";

/**
 * This layer's contribution to `appRouter`, keyed by the top-level name each
 * router is mounted under.
 *
 * One key here, but still a map and not a bare `notificationsRouter` export:
 * every layer exports the same `routers` shape so the generated
 * `.composition/layer-routers.ts` has exactly one contract to read, and so a
 * layer that later owns a second top-level key (as `layers/teams` owns both
 * `teams` and `invites`) needs no special case.
 *
 * `satisfies`, never a `: Record<string, AnyRouter>` annotation: the annotation
 * would widen the procedures away and every `trpc.notifications.*` call would
 * lose its input and output types on the client, since `AppRouter` is inferred
 * straight through this object. That matters concretely here —
 * `app/composables/use-notifications-store.ts` derives its whole `Notification`
 * type from `RouterOutput["notifications"]["list"][0]`.
 */
export const routers = {
  notifications: notificationsRouter,
} satisfies Record<string, AnyRouter>;

/**
 * Deliberately OUTSIDE `routers`, and that is the whole point.
 *
 * `routers` is spread into `appRouter` at the TOP level by the generated
 * `.composition/layer-routers.ts`. This router is not a top-level namespace: it
 * is mounted by `@nuxfire/layer-admin/server/trpc/router` under
 * `admin.notifications`, which is the path the client already calls
 * (`trpc.admin.notifications.send`, from `app/pages/admin/notifications.vue`).
 * Adding it to the map above would silently republish it as
 * `trpc.notifications.send` — colliding with this layer's own `notifications`
 * key — and break that call site.
 *
 * So the code lives in this layer (it is Notification-domain logic, merely
 * `platformAdminProcedure`-gated) while the admin layer owns the mount point. A
 * named export is how a layer offers a router it does not own the mount point
 * for — exactly the shape `layers/billing` uses for `adminPlansRouter`. (That
 * aggregator lived in `apps/app/server/trpc/routers/admin/index.ts` when
 * this comment was first written; Fase 3 passo 4, the step right after this
 * one, moved it into `layers/admin` — and this import needed no change at all,
 * because it was always a package specifier.)
 */
export { adminNotificationsRouter } from "./admin-notifications";
