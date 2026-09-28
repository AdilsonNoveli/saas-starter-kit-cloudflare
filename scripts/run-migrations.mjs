#!/usr/bin/env node
// Applies one migration history using drizzle-orm's migrate() directly —
// never the drizzle-kit CLI. `bunx drizzle-kit migrate`'s interactive
// spinner UI (SPEC-0006) reliably crashes with an unhelpful "exit status 1"
// and no further output when spawned without a real TTY attached, which is
// exactly how SST's `command.local.Command` runs it (Pulumi pipes the
// child process's streams; it never allocates a console). Verified: the
// identical migration, run this way, applies cleanly and reports the real
// Postgres error (schema/table/constraint/hint) on failure instead of a
// bare exit code. `drizzle-kit generate` (author-time, always run
// interactively by a human, never by this pipeline) is unaffected and
// still the right tool for producing new migration files.
//
// Usage (from the app/layer directory whose migrations/ this applies,
// matching that directory's own drizzle.config.ts migrations.table/schema):
//   DATABASE_HOST=... DATABASE_PORT=5432 DATABASE_USER=... DATABASE_PASSWORD=... DATABASE_NAME=... \
//     node ../../scripts/run-migrations.mjs ./migrations __drizzle_migrations_kanban drizzle

import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";

const [, , migrationsFolder, migrationsTable = "__drizzle_migrations", migrationsSchema = "drizzle"] = process.argv;

if (!migrationsFolder) {
  console.error("Usage: node run-migrations.mjs <migrationsFolder> [migrationsTable] [migrationsSchema]");
  process.exit(1);
}

const sql = postgres({
  host: process.env.DATABASE_HOST,
  port: Number(process.env.DATABASE_PORT ?? 5432),
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
  ssl: "require",
  max: 1,
});

const db = drizzle(sql);

try {
  await migrate(db, { migrationsFolder, migrationsTable, migrationsSchema });
  console.log(`OK: ${migrationsSchema}.${migrationsTable} (${migrationsFolder}) applied successfully.`);
} catch (error) {
  console.error(`MIGRATION FAILED for ${migrationsSchema}.${migrationsTable} (${migrationsFolder}) — full error below:`);
  console.error({
    message: error?.message,
    code: error?.code,
    detail: error?.detail,
    hint: error?.hint,
    schema_name: error?.schema_name,
    table_name: error?.table_name,
    constraint_name: error?.constraint_name,
    stack: error?.stack,
  });
  process.exitCode = 1;
} finally {
  await sql.end();
}
