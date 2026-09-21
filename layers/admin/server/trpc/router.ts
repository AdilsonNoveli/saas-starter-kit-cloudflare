import type { AnyRouter } from "@trpc/server";
import { router } from "~~/server/trpc/trpc";
import auditLog from "./admin-audit-log";
// Sending a notification to an arbitrary user is notifications-domain logic
// that merely happens to be admin-*gated*, so it moved to
// @nuxfire/layer-notifications in Fase 3 passo 3 — as a named export OUTSIDE
// that layer's `routers` map, because it must stay mounted at
// `admin.notifications` (the path `app/pages/admin/notifications.vue` already
// calls) rather than be republished at the top level.
//
// This import needed ZERO changes when this file moved out of
// `apps/app/server/trpc/routers/admin/index.ts`: it was already a package
// specifier, already portable. Same for `plans` below. That was the point of
// leaving those two mount points pointing at the layers that own the logic, and
// the reason `admin` was extracted last.
import { adminNotificationsRouter as notifications } from "@nuxfire/layer-notifications/server/trpc/router";
// Plan/Benefit CRUD and the Stripe product/price catalog sync moved to
// @nuxfire/layer-billing in Fase 3 passo 2a — billing-domain logic that is
// merely admin-*gated*, not admin-domain logic. It is imported here rather than
// spread into `appRouter` with the rest of that layer's `routers` map on
// purpose: it must stay mounted at `admin.plans`, which is the path the client
// already calls.
import { adminPlansRouter as plans } from "@nuxfire/layer-billing/server/trpc/router";
import queue from "./admin-queue";
import teams from "./admin-teams";

// Everything platform-scoped lives under `admin.*`, never mixed into the
// tenant routers next to it: the namespace is what makes "is this procedure
// behind platformAdminProcedure?" answerable by looking at the path alone.
const adminRouter = router({ teams, plans, queue, auditLog, notifications });

/**
 * This layer's contribution to `appRouter`, keyed by the top-level name each
 * router is mounted under.
 *
 * One key, `admin`, and the whole reason this file exists in this shape: until
 * Fase 3 passo 4 the aggregator above was a bare default export that
 * `apps/app/server/trpc/routers/index.ts` imported by hand
 * (`import admin from "./admin/index"`), the last hardcoded layer-ish import
 * left in the Composition Root. Exporting the same `routers` map every other
 * layer exports puts `admin` through the SAME generated
 * `.composition/layer-routers.ts` composition as `teams`, `billing`,
 * `notifications` and `kanban` — core and feature layers were always documented
 * as one mechanism, and this removes the one remaining exception.
 *
 * `satisfies`, never a `: Record<string, AnyRouter>` annotation: the annotation
 * would widen the procedures away and every `trpc.admin.*` call would lose its
 * input and output types on the client, since `AppRouter` is inferred straight
 * through this object. Concretely load-bearing here —
 * `app/pages/admin/companies/index.vue` derives its whole `Company` type from
 * `RouterOutput["admin"]["teams"]["listTeams"][number]`, and
 * `app/pages/admin/queue/index.vue` does the same for `DeadLetter`.
 */
export const routers = {
  admin: adminRouter,
} satisfies Record<string, AnyRouter>;
