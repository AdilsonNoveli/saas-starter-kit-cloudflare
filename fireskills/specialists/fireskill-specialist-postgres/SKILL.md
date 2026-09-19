---
name: fireskill-specialist-postgres
description: Model, query, migrate, and operate PostgreSQL with integrity, indices, concurrency, security, performance, and recovery. Use for schemas, SQL, EXPLAIN, locks, isolation levels, migrations, roles, backups, or tuning in Postgres; do not use for other relational databases without confirming engine-specific semantics, and combine with `fireskill-specialist-drizzle` for Drizzle schema, migrations, and queries in Nuxfire.
---

# PostgreSQL

## When to Use

- Trigger to design schemas, write or review SQL, select index strategies, analyze
  execution plans (`EXPLAIN`), diagnose locks/deadlocks, plan migrations, or size
  backups and restore procedures in Postgres.
- Trigger when an ORM (Drizzle) generates inefficient queries whose root cause is
  relational modeling or missing indexes.
- Combine with `$fireskill-specialist-drizzle` when the entry point is Drizzle schema/queries,
  and with `$fireskill-specialist-performance-engineering` when bottlenecks span outside the database (app, network, cache).

## Workflow

1. Determine Postgres version, installed extensions, current dataset volume,
   projected growth, workload profile (OLTP, analytical, mixed), and data ownership before recommending changes.
2. Model invariants using precise column types, `NOT NULL`, `CHECK`, `UNIQUE`, foreign keys,
   and normalization appropriate to the access patterns.
3. Write the simplest SQL query expressing the business rule and inspect the actual
   plan using `EXPLAIN (ANALYZE, BUFFERS)` on representative datasets, never on empty test tables.
4. Select indexes based on observed workload predicates (`WHERE`, `ORDER BY`, `JOIN`) — never
   speculatively based on column presence alone.
5. Analyze transaction isolation levels, transaction duration, lock acquisition ordering,
   and expected concurrency under production load.
6. Plan migrations ensuring dual-version compatibility (old and new application versions
   coexisting during rolling deploys), with tested rollback strategies.
7. Tag execution tasks with `[MIGRATION]`, point to versioned migration scripts, apply
   to test environments, and verify migrator history before declaring completion.
8. Validate backup, restore, monitoring, and capacity in the target environment before
   marking changes production-ready.

## Core Rules

- Prefer database-level constraints (`NOT NULL`, `CHECK`, `UNIQUE`, FK, `EXCLUDE`) for all
  invariants that must always hold — app-only validation allows corrupt state via alternative write paths.
- Avoid `SELECT *` in production queries, imprecise types (`text` for closed enums, `float` for currency),
  and redundant indexes mirroring existing index prefixes.
- Never add indexes without inspecting write frequency, table size, predicate selectivity,
  and before/after execution plans — poorly chosen indexes degrade write throughput without improving reads.
- Keep transactions short (no external I/O, user input, or network calls inside transactions)
  and maintain consistent lock ordering across all code paths to eliminate deadlocks.
- Run `EXPLAIN (ANALYZE, BUFFERS)` only where executing statements is safe (never in
  production without read replicas or rollback transactions).
- Apply expand/contract migrations for breaking schema changes or high-volume tables:
  never drop or rename a column read by production code in the same deployment step.
- Grant least privilege: separate migration roles (DDL), application roles (DML), and
  read-only analytics roles (`SELECT` only).
