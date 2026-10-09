import type { Hyperdrive } from "@cloudflare/workers-types";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export type Database = PostgresJsDatabase<typeof schema>;

/** The slice of a Worker environment `withDb` needs: the Hyperdrive binding. */
export type DatabaseEnv = { AppDB: Pick<Hyperdrive, "connectionString"> };

/**
 * Opens a Hyperdrive-backed Postgres connection, hands a Drizzle client to `fn`, and always
 * closes the connection afterwards — on success and on error (the error is rethrown).
 *
 * Every Worker in `apps/functions/src` that talks to Postgres goes through this helper: a
 * connection opened per invocation and never closed exhausts the pool (see
 * `apps/app/server/utils/db.ts`, which documents the same failure). `scripts/workers-db-guard.test.ts`
 * fails any file that opens `postgres(env.AppDB.connectionString, ...)` outside this one.
 */
export async function withDb<T>(
  env: DatabaseEnv,
  fn: (db: Database) => Promise<T>,
): Promise<T> {
  const sql = postgres(env.AppDB.connectionString, {
    max: 5,
    fetch_types: false,
  });
  try {
    return await fn(drizzle(sql, { schema }));
  } finally {
    await sql.end({ timeout: 5 });
  }
}
