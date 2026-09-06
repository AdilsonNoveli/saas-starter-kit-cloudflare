import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq } from "drizzle-orm";
import * as schema from "./database/schema";
import type { ExecutionContext, Hyperdrive } from "@cloudflare/workers-types";

interface Environment {
  AppDB: Hyperdrive;
}

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
        await db
          .update(schema.jobs)
          .set({ status: "completed" })
          .where(eq(schema.jobs.id, job.id))
          .execute();
        await db
          .insert(schema.logs)
          .values({
            jobId: job.id,
            message: "job completed",
          })
          .execute();
        message.ack();
      } catch (err) {
        console.error("job failed", job.id, err);
        try {
          await db
            .update(schema.jobs)
            .set({ status: "failed" })
            .where(eq(schema.jobs.id, job.id))
            .execute();
          await db
            .insert(schema.logs)
            .values({
              jobId: job.id,
              // The real reason, not a generic "job failed": this row is the
              // only place the failure text survives, and dlq-consumer.ts
              // reads it back to fill DeadLetterRecord.error once retries run
              // out.
              message: `job failed: ${err instanceof Error ? err.message : String(err)}`,
            })
            .execute();
        } catch (loggingErr) {
          console.error("failed to record job failure", job.id, loggingErr);
        }
        // triggers wrangler's configured retry_delay/max_retries; after
        // max_retries is exhausted, Cloudflare Queues routes the message to
        // the dead letter queue configured in infra/jobs.ts.
        message.retry();
      }
    }
  },
};
