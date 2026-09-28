#!/usr/bin/env node
// Prints the SQL to mark an already-applied migration history as "done"
// against an environment that already has its tables (SPEC-0006) — used
// exactly once per environment, per migration history, the moment that
// history is split off (or, later, whenever a brand-new environment is
// seeded from a snapshot of an existing one instead of a fresh deploy).
//
// Never runs anything itself: it only prints SQL for an operator to run by
// hand against that one environment's Postgres, with an explicit
// understanding of what it does. This mirrors exactly what
// `drizzle-orm/postgres-js/migrator`'s own `migrate()` does when it decides
// a migration is already applied — same table shape, same hash algorithm
// (sha256 of the full .sql file content), same `created_at` column (the
// migration's `when` from meta/_journal.json) — verified by reading
// `node_modules/drizzle-orm/pg-core/dialect.js` and
// `node_modules/drizzle-orm/migrator.js` directly, not assumed. Marking a
// migration "applied" this way is 100% safe for a database that already has
// the exact schema that migration's CREATE TABLE/ALTER TABLE statements
// would have produced — it must never be used to skip a migration whose SQL
// was never actually run.
//
// Usage:
//   node scripts/print-migration-bootstrap.mjs <migrationsFolder> <table> [schema]
//
// Example (base, already the default table/schema):
//   node scripts/print-migration-bootstrap.mjs apps/functions/src/database/migrations __drizzle_migrations
// Example (a feature layer):
//   node scripts/print-migration-bootstrap.mjs layers/kanban/migrations __drizzle_migrations_kanban

import { createHash } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

// Pure: reads the journal + migration files and computes each row's
// drizzle-orm-compatible hash. No console output, no process.exit — the CLI
// entry point below is the only side-effectful part of this file.
export function computeBootstrapRows(migrationsFolder) {
  const journalPath = join(migrationsFolder, "meta", "_journal.json");
  if (!existsSync(journalPath)) {
    throw new Error(`No meta/_journal.json found under ${migrationsFolder}`);
  }
  const journal = JSON.parse(readFileSync(journalPath, "utf8"));
  return journal.entries.map((entry) => {
    const sqlPath = join(migrationsFolder, `${entry.tag}.sql`);
    const content = readFileSync(sqlPath, "utf8");
    const hash = createHash("sha256").update(content).digest("hex");
    return { tag: entry.tag, hash, when: entry.when };
  });
}

// Pure: formats the bootstrap SQL from already-computed rows.
export function renderBootstrapSql(migrationsFolder, table, schema, rows) {
  const quotedSchema = `"${schema}"`;
  const quotedTable = `"${table}"`;
  const lines = [
    `-- Bootstrap for ${migrationsFolder} against ${quotedSchema}.${quotedTable}`,
    `-- Run this ONCE, by hand, against an environment whose database already`,
    `-- has the tables these migrations would create — never against a fresh one`,
    `-- (a fresh environment should just run the real "drizzle-kit migrate").`,
    ``,
    `CREATE SCHEMA IF NOT EXISTS ${quotedSchema};`,
    `CREATE TABLE IF NOT EXISTS ${quotedSchema}.${quotedTable} (`,
    `  id SERIAL PRIMARY KEY,`,
    `  hash text NOT NULL,`,
    `  created_at bigint`,
    `);`,
    ``,
  ];
  for (const row of rows) {
    lines.push(
      `-- ${row.tag}\nINSERT INTO ${quotedSchema}.${quotedTable} (hash, created_at) VALUES ('${row.hash}', ${row.when});`,
    );
  }
  return lines.join("\n");
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const [, , migrationsFolder, table, schema = "drizzle"] = process.argv;
  if (!migrationsFolder || !table) {
    console.error(
      "Usage: node scripts/print-migration-bootstrap.mjs <migrationsFolder> <table> [schema]",
    );
    process.exit(1);
  }
  try {
    const rows = computeBootstrapRows(migrationsFolder);
    console.log(renderBootstrapSql(migrationsFolder, table, schema, rows));
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
