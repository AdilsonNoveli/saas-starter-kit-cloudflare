import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { desc, eq } from "drizzle-orm";
import * as schema from "./database/schema";
import type { ExecutionContext, Hyperdrive } from "@cloudflare/workers-types";

interface Environment {
  AppDB: Hyperdrive;
}

/** Used when the failure log is missing — a record with no reason still beats no record. */
const FALLBACK_ERROR = "Exceeded max retries — no failure log found";

/**
 * End of the line for a job message. JobQueue already retried it three times
 * (infra/jobs.ts) before Cloudflare routed it here, so this consumer only
 * records what arrived and acknowledges it: retrying from the dead letter
 * queue would recreate the exact failure loop the retries were meant to end.
 * Replaying is a deliberate human action via `admin.queue.replayDeadLetter`.
 */
export default {
  async queue(
    batch: MessageBatch,
    env: Environment,
    _ctx: ExecutionContext,
  ): Promise<void> {
    const sql = postgres(env.AppDB.connectionString, {
      max: 5,
      fetch_types: false,
    });
    const db = drizzle(sql, { schema });
    for (const message of batch.messages) {
      const job = message.body as typeof schema.jobs.$inferSelect;
      try {
        // jobs-consumer.ts writes the real error text into the job's last log
        // line; that is the only place it survives the retries.
        const [failureLog] = await db
          .select({ message: schema.logs.message })
          .from(schema.logs)
          .where(eq(schema.logs.jobId, job.id))
          .orderBy(desc(schema.logs.createdAt))
          .limit(1);

        await db
          .insert(schema.deadLetterRecords)
          .values({
            message: job,
            error: failureLog?.message ?? FALLBACK_ERROR,
            teamId: job.teamId ?? null,
          })
          .execute();
      } catch (err) {
        console.error("failed to record dead letter", job?.id, err);
      }
      // Always acknowledged, recording failures included: see the note above.
      message.ack();
    }
  },
};
