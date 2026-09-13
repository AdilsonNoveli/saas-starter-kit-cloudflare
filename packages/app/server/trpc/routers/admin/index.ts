import { router } from "../../trpc";
import auditLog from "./audit-log";
import notifications from "./notifications";
// Plan/Benefit CRUD and the Stripe product/price catalog sync moved to
// @nuxfire/layer-billing in Fase 3 passo 2a — billing-domain logic that is
// merely admin-*gated*, not admin-domain logic. It is imported here rather than
// spread into `appRouter` with the rest of that layer's `routers` map on
// purpose: it must stay mounted at `admin.plans`, which is the path the client
// already calls. The mount point stays with this aggregator until `admin` is
// itself extracted (the step after `notifications`).
import { adminPlansRouter as plans } from "@nuxfire/layer-billing/server/trpc/router";
import queue from "./queue";
import teams from "./teams";

// Everything platform-scoped lives under `admin.*`, never mixed into the
// tenant routers next to it: the namespace is what makes "is this procedure
// behind platformAdminProcedure?" answerable by looking at the path alone.
export default router({ teams, plans, queue, auditLog, notifications });
