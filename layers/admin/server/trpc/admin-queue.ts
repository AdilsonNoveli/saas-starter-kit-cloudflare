import { TRPCError } from "@trpc/server";
import { count, desc, eq } from "drizzle-orm";
import { z } from "zod";
// See admin-teams.ts: layers import the Composition Root's tRPC primitives and
// server utils explicitly.
import { platformAdminProcedure, router } from "~~/server/trpc/trpc";
import { useDB } from "~~/server/utils/db";
import { recordAuditLog } from "~~/server/utils/audit-log";
// `Job` and `DeadLetterRecord` live in layers/teams (SPEC-0006, teams
// migration split, 2026-09-28) and `Log` in apps/functions core-schema — none
// of the three moved with this router: they are generic async-job-processing
// infrastructure, written by src/jobs-consumer.ts and src/dlq-consumer.ts, not
// admin-domain data. This module only reads them, via the barrel, which is
// why the import below is unaffected by where each table actually lives.
import {
  deadLetterRecords,
  jobs,
  logs,
  teams,
} from "@nuxfire/functions/schema";

/** Cron runs belong to no team, so their logs carry the `Log.jobId` default. */
const CRON_JOB_ID = "cron";

/**
 * `DeadLetterRecord.message` is jsonb, so it is `unknown` on the way out. The
 * only field the replay path needs from it is the original job id, and only to
 * label the audit line — a malformed message still replays, it just logs a
 * null target rather than inventing one.
 */
function readJobId(message: unknown): string | null {
  if (typeof message !== "object" || message === null) return null;
  const { id } = message as { id?: unknown };
  return typeof id === "string" ? id : null;
}

/**
 * Queue operations for the platform owner. Job processing is infrastructure of
 * the SaaS itself, not a tenant feature, which is why nothing here is scoped by
 * team and everything sits behind `platformAdminProcedure`.
 */
export default router({
  // Cross-tenant on purpose: the point is the health of the queue as a whole,
  // not of any one team's jobs.
  getQueueStats: platformAdminProcedure.query(() =>
    useDB()
      .select({ status: jobs.status, count: count() })
      .from(jobs)
      .groupBy(jobs.status)
      .orderBy(jobs.status),
  ),

  getDeadLetterMessages: platformAdminProcedure.query(() =>
    // `teamId` alone is unreadable in a table, so the team name comes along in
    // the same statement. Left join: `teamId` is nullable, and a record whose
    // message had no resolvable team is exactly the kind an operator most
    // needs to see.
    useDB()
      .select({
        id: deadLetterRecords.id,
        message: deadLetterRecords.message,
        error: deadLetterRecords.error,
        teamId: deadLetterRecords.teamId,
        teamName: teams.name,
        createdAt: deadLetterRecords.createdAt,
        replayedAt: deadLetterRecords.replayedAt,
      })
      .from(deadLetterRecords)
      .leftJoin(teams, eq(teams.id, deadLetterRecords.teamId))
      .orderBy(desc(deadLetterRecords.createdAt)),
  ),

  replayDeadLetter: platformAdminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const record = await useDB().query.deadLetterRecords.findFirst({
        where: eq(deadLetterRecords.id, input.id),
      });

      if (!record) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Dead letter record not found",
        });
      }

      // `replayedAt` is never cleared, so it doubles as the guard against
      // sending the same failing message round the queue twice.
      if (record.replayedAt) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This message has already been replayed",
        });
      }

      // The stored message is the original Job object, the same shape
      // jobs-consumer.ts reads back off the queue.
      await ctx.jobsQueue.send(record.message);

      const [replayed] = await useDB()
        .update(deadLetterRecords)
        .set({ replayedAt: new Date() })
        .where(eq(deadLetterRecords.id, record.id))
        .returning();

      await recordAuditLog({
        actorUserId: ctx.user.id,
        action: "admin.queue.replayDeadLetter",
        targetType: "job",
        targetId: readJobId(record.message),
        metadata: { deadLetterRecordId: record.id },
        ip: getRequestIP(ctx.event, { xForwardedFor: true }) ?? null,
      });

      return replayed ?? record;
    }),

  // Back from Phase 0, where it was removed for leaking platform-wide cron
  // logs to every member of every tenant. Same query, correct authority.
  getCronLogs: platformAdminProcedure.query(() =>
    useDB()
      .select({
        id: logs.id,
        message: logs.message,
        createdAt: logs.createdAt,
      })
      .from(logs)
      .where(eq(logs.jobId, CRON_JOB_ID))
      .orderBy(desc(logs.createdAt))
      .limit(20),
  ),
});
