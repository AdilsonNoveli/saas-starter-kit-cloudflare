import { router } from "../../trpc";
import auditLog from "./audit-log";
// Same story as `plans` below, one step later: sending a notification to an
// arbitrary user is notifications-domain logic that merely happens to be
// admin-*gated*, so it moved to @nuxfire/layer-notifications in Fase 3 passo 3
// — as a named export OUTSIDE that layer's `routers` map, because it must stay
// mounted at `admin.notifications` (the path `app/pages/admin/notifications.vue`
// already calls) rather than be republished at the top level.
import { adminNotificationsRouter as notifications } from "@nuxfire/layer-notifications/server/trpc/router";
// Plan/Benefit CRUD and the Stripe product/price catalog sync moved to
// @nuxfire/layer-billing in Fase 3 passo 2a — billing-domain logic that is
// merely admin-*gated*, not admin-domain logic. It is imported here rather than
// spread into `appRouter` with the rest of that layer's `routers` map on
// purpose: it must stay mounted at `admin.plans`, which is the path the client
// already calls. The mount point stays with this aggregator until `admin` is
// itself extracted (the next and last step of Fase 3).
import { adminPlansRouter as plans } from "@nuxfire/layer-billing/server/trpc/router";
import queue from "./queue";
import teams from "./teams";

// Everything platform-scoped lives under `admin.*`, never mixed into the
// tenant routers next to it: the namespace is what makes "is this procedure
// behind platformAdminProcedure?" answerable by looking at the path alone.
export default router({ teams, plans, queue, auditLog, notifications });
