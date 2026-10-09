import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@nuxfire/functions/schema";
import type { Hyperdrive } from "@cloudflare/workers-types";
import type { H3Event } from "h3";

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

function createDB(): { db: DB; client: postgres.Sql } {
  if (!binding) {
    throw new Error(
      "Hyperdrive binding 'DB' is not available yet — useDB() was called before the request lifecycle set it up.",
    );
  }
  const client = postgres(binding.connectionString, {
    max: 5,
    fetch_types: false,
  });
  return { db: drizzle(client, { schema }), client };
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
    // leak one across requests, which is the property that matters. Nothing
    // will close this one — see the comment on closeDB() below for why that
    // was, until now, also true of the normal per-request path.
    return createDB().db;
  }
  const ctx = event.context as { _db?: DB; _dbClient?: postgres.Sql };
  if (!ctx._db) {
    const created = createDB();
    ctx._db = created.db;
    ctx._dbClient = created.client;
  }
  return ctx._db;
}

// Cloudflare tears down a Worker's I/O when a request ends, but it does not
// call .end() on whatever postgres.js sockets that request opened — those
// are only closed if something explicitly does it. Every useDB() call opens
// up to `max: 5` raw connections against Hyperdrive's origin pool, and until
// server/plugins/database-binding.ts started calling this from `afterResponse`/
// `error`, nothing ever did: on the local dev stage, which falls back to
// Supabase's Session pooler (15-connection cap, see AGENTS.md) rather than
// going through real Hyperdrive, that leak silently exhausted the pool after
// a couple dozen dashboard requests and took down an unrelated `sst deploy`'s
// `drizzle-kit migrate` step with "max clients reached" — reproduced and
// confirmed via pg_stat_activity before this fix (idle postgres.js sessions,
// 12+ minutes old, one per closed browser tab).
export async function closeDB(event: H3Event): Promise<void> {
  const ctx = event.context as { _dbClient?: postgres.Sql };
  const client = ctx._dbClient;
  if (!client) return;
  // Cleared before awaiting so a second call (afterResponse AND error can
  // both fire for the same request) sees nothing left to close instead of
  // ending the same client twice.
  ctx._dbClient = undefined;
  await client.end({ timeout: 5 });
}

export type InsertRole = typeof schema.roles.$inferInsert;
export type InsertPermission = typeof schema.permissions.$inferInsert;
