import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./database/schema";
import type { ExecutionContext, Hyperdrive } from "@cloudflare/workers-types";

interface Environment {
  AppDB: Hyperdrive;
}

export default {
  async scheduled(
    _event: ScheduledEvent,
    env: Environment,
    _ctx: ExecutionContext,
  ) {
    const sql = postgres(env.AppDB.connectionString, {
      max: 5,
      fetch_types: false,
    });
    const db = drizzle(sql, { schema });
    await db
      .insert(schema.logs)
      .values({
        message: "scheduled task executed",
      })
      .execute();
  },
};
