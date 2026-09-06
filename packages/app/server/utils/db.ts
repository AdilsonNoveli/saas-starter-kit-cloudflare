import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@movimenta-bairro/functions/schema";
import type { Hyperdrive } from "@cloudflare/workers-types";

export { sql, eq, ne, and, or, count } from "drizzle-orm";

export const tables = schema;

type DB = ReturnType<typeof drizzle<typeof schema>>;

let binding: Hyperdrive | undefined;

// Set by server/plugins/database-binding.ts on every request, since the
// Hyperdrive binding isn't reachable outside the H3 event. The binding
// itself is a plain handle, not an I/O object, so holding it here is safe —
// unlike the client built from it (see useDB below).
export function setHyperdriveBinding(hyperdrive: Hyperdrive) {
  binding = hyperdrive;
}

function createDB(): DB {
  if (!binding) {
    throw new Error(
      "Hyperdrive binding 'DB' is not available yet — useDB() was called before the request lifecycle set it up.",
    );
  }
  const sql = postgres(binding.connectionString, {
    max: 5,
    fetch_types: false,
  });
  return drizzle(sql, { schema });
}

export function useDB(): DB {
  // Scoped to the current request, never shared across requests. A
  // postgres.js client is an I/O object, and Workers tears down the I/O of
  // a request once that request ends — so a client built during request A
  // and reused in request B fails, which is precisely what Cloudflare
  // documents under "Cannot perform I/O on behalf of a different request"
  // (developers.cloudflare.com/hyperdrive/observability/troubleshooting):
  //
  //   "A database connection or client created during one request is being
  //    reused in a subsequent request. Create a new database client on every
  //    request instead of caching it in a global variable. Hyperdrive's
  //    connection pooling already eliminates the connection startup
  //    overhead."
  //
  // This module used to keep one client for the isolate's lifetime, which
  // is what made queries fail intermittently inside the Worker while the
  // exact same SQL succeeded when run directly against Postgres.
  let event;
  try {
    event = useEvent();
  } catch {
    // No request context (asyncContext unavailable): fall back to a fresh
    // client per call. More clients than strictly needed, but it can never
    // leak one across requests, which is the property that matters.
    return createDB();
  }
  const ctx = event.context as { _db?: DB };
  if (!ctx._db) ctx._db = createDB();
  return ctx._db;
}

export type InsertRole = typeof schema.roles.$inferInsert;
export type InsertPermission = typeof schema.permissions.$inferInsert;
