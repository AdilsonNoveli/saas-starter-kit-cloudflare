import { lt } from "drizzle-orm";
import * as schema from "./database/schema";
import { withDb, type Database } from "./database/with-db";
import type { ExecutionContext, Hyperdrive } from "@cloudflare/workers-types";

interface Environment {
  AppDB: Hyperdrive;
}

// A session row is kept this long after it expired (D-F3-2): enough for the
// person to still see it listed as expired in an audit, and no longer.
export const SESSION_RETENTION_DAYS = 90;
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Removes the UserSession rows that expired more than ninety days before `now`.
 * Idempotent: a second run removes nothing more.
 */
export async function purgeExpiredSessions(
  db: Pick<Database, "delete">,
  now: Date,
) {
  const cutoff = new Date(now.getTime() - SESSION_RETENTION_DAYS * DAY_MS);
  await db.delete(schema.userSessions).where(lt(schema.userSessions.expiresAt, cutoff));
}

export default {
  async scheduled(
    _event: ScheduledEvent,
    env: Environment,
    _ctx: ExecutionContext,
  ) {
    await withDb(env, async (db) => {
      await purgeExpiredSessions(db, new Date());
      await db
        .insert(schema.logs)
        .values({
          message: "scheduled task executed",
        })
        .execute();
    });
  },
};
