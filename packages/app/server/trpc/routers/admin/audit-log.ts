import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { platformAdminProcedure, router } from "../../trpc";
import { auditLogs, users } from "@nuxfire/functions/schema";

/**
 * The append-only trail every platform-admin mutation writes
 * (server/utils/audit-log.ts). Read-only by construction: there is no procedure
 * here that writes, edits or deletes a line, because a trail an operator can
 * rewrite is not a trail.
 */
export default router({
  list: platformAdminProcedure
    .input(
      z
        .object({
          // Same "no server-side pagination, filter/sort client-side with
          // TanStack" convention as the other admin listings, with a higher
          // ceiling: this table gains a row on every administrative action, so
          // 100 covers far less history here than it does for teams or plans.
          limit: z.number().int().min(1).max(500).default(100),
        })
        .default({ limit: 100 }),
    )
    .query(({ input }) =>
      // `actorUserId` is deliberately not a foreign key — the trail has to
      // outlive the user it names — so the join is a best-effort label lookup,
      // not an integrity constraint. Left join: a line whose actor has since
      // deleted their account comes back with null name/email and is still
      // listed, which is precisely the line an operator most needs to see.
      useDB()
        .select({
          id: auditLogs.id,
          actorUserId: auditLogs.actorUserId,
          actorName: users.name,
          actorEmail: users.email,
          action: auditLogs.action,
          targetType: auditLogs.targetType,
          targetId: auditLogs.targetId,
          metadata: auditLogs.metadata,
          ip: auditLogs.ip,
          createdAt: auditLogs.createdAt,
        })
        .from(auditLogs)
        .leftJoin(users, eq(users.id, auditLogs.actorUserId))
        .orderBy(desc(auditLogs.createdAt))
        .limit(input.limit),
    ),
});
