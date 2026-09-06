import { router } from "../../trpc";
import auditLog from "./audit-log";
import plans from "./plans";
import queue from "./queue";
import teams from "./teams";

// Everything platform-scoped lives under `admin.*`, never mixed into the
// tenant routers next to it: the namespace is what makes "is this procedure
// behind platformAdminProcedure?" answerable by looking at the path alone.
export default router({ teams, plans, queue, auditLog });
