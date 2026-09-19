# PostgreSQL Standards and References

## Types and Data Modeling

- Use `NOT NULL`, `CHECK`, `UNIQUE`, foreign keys, and domain types whenever they express
  real invariants, not just advisory comments.
- Prefer `numeric` / integer in the lowest currency unit (cents) for monetary values; never
  use `float` / `double precision`, which loses precision during additions and comparisons.
- Use `timestamptz` for true points in time (stored in UTC, displayed converted); use
  `timestamp` without timezone only for values representing abstract local wall-clock times
  without an associated instant (e.g., recurring store opening hours).
- `jsonb` is for genuinely dynamic data (schema not known ahead of time), never as a
  shortcut to avoid modeling known columns — strongly typed columns are indexable, checkable,
  and significantly cheaper to query.
- IDs: `bigint identity` / sequence for sequential internal keys; UUID when the key must be
  generated outside the database or must not expose sequential order/volume.
- Define an explicit policy for soft delete (`deleted_at`) vs hard delete — soft deletes
  require partial indexes (`WHERE deleted_at IS NULL`) to maintain correct uniqueness and performance.

## Indexes

- **B-tree** (default): equality and ranges (`=`, `<`, `>`, `BETWEEN`, `ORDER BY`). Covers most cases.
- **GIN**: `jsonb`, arrays, full-text search (`tsvector`) — ideal for contains/overlaps, higher write cost than B-tree.
- **GiST**: geometric data, range types, proximity/exclusion searches (`EXCLUDE USING gist`).
- **BRIN**: very large tables with strong physical-logical correlation (e.g., append-only timestamp columns) — tiny footprint, but ineffective if data is not physically ordered.
- **Partial** (`WHERE status = 'pending'`): when queries consistently filter for a small, stable subset — smaller and faster than indexing the entire table.
- **Expression** (`(lower(email))`): when the query applies a function over a column; without it, the planner cannot use a B-tree index for `WHERE lower(email) = ...`.
- **Composite**: column order matters — high-selectivity columns used in equality checks generally come first; composite indexes serve prefixes (index on `(a, b)` serves queries on `a` and `(a, b)`, but not `b` alone).
- Every index incurs write overhead and disk storage; never create indexes speculatively — create them based on real query plans and regularly audit unused indexes (`pg_stat_user_indexes.idx_scan = 0`).

## Concurrency and Isolation

- MVCC: readers do not block writers and writers do not block readers; concurrent writers on the same row still serialize.
- `READ COMMITTED` (default): each statement sees a new snapshot; allows non-repeatable reads and phantom reads between statements within the same transaction.
- `REPEATABLE READ`: single snapshot for the entire transaction; immune to non-repeatable reads and phantom reads, but may fail with serialization errors on conflicting writes (application must handle and retry).
- `SERIALIZABLE`: guarantees serializable execution; highest abort rate under high concurrency, correct only when the application is designed to retry aborted transactions.
- Deadlocks: caused by inconsistent lock acquisition order across concurrent transactions — standardize acquisition ordering (e.g., always sort by PK ascending) to eliminate this class of defect.
- `SELECT ... FOR UPDATE` / `FOR UPDATE SKIP LOCKED` for task queues processed by multiple workers without contention.

## Interpreting EXPLAIN

- `EXPLAIN (ANALYZE, BUFFERS)` executes the query and shows actual runtime, actual vs estimated row counts, and buffer hits/reads — use only in environments where executing the query is safe.
- Discrepancies between estimated and actual rows (`rows=10` estimated vs `rows=100000` actual) indicate outdated statistics — run `ANALYZE` on the table.
- `Seq Scan` is not inherently bad: on small tables or when reading a large fraction of rows, sequential scan is faster than index lookup.
- `Nested Loop` with many iterations on the outer loop is expensive; `Hash Join` suits large unordered sets; `Merge Join` favors presorted inputs on join keys.
- Buffer hits (`shared hit`) vs disk reads (`read`) show whether the working set fits into `shared_buffers` and OS page cache.

## Migrations (Expand / Contract)

1. **Expand**: add new nullable column/table or column with inexpensive default, without removing anything used by the previous application version.
2. **Backfill data**: migrate in batches (not a single monolithic transaction) and apply dual-write logic if needed while both application versions run concurrently.
3. **Contract**: remove legacy column/table only after 100% of production traffic runs on the new version.
- DDL rewriting tables (`ALTER COLUMN TYPE` incompatibility, adding `NOT NULL` with volatile defaults) takes exclusive table locks for the duration of the rewrite — measure table size before scheduling in production.
- Add indexes using `CREATE INDEX CONCURRENTLY` to avoid blocking table writes (cannot run inside transactions; failures require `DROP INDEX CONCURRENTLY` on the invalid index before retrying).

## Security and Operations

- Application database roles should have no DDL privileges; migration roles must be isolated and used exclusively in deployment pipelines; read-only roles (`SELECT` only) for analytics.
- Monitor active connections vs `max_connections`, waiting locks, deadlocks, replication lag, table/index bloat, and slow queries via `pg_stat_statements`.
- Size connection pools (PgBouncer or driver pools) based on database hardware capacity, not the number of application server instances — idle connections consume backend memory.
- Explicitly plan RPO (acceptable data loss) and RTO (recovery time); WAL archiving and streaming replication reduce RPO, but only regularly tested restore drills prove real RTO.

## Authoritative Documentation

- Official Documentation: https://www.postgresql.org/docs/current/
- Data Types: https://www.postgresql.org/docs/current/datatype.html
- Constraints: https://www.postgresql.org/docs/current/ddl-constraints.html
- Indexes: https://www.postgresql.org/docs/current/indexes.html
- Concurrency (MVCC): https://www.postgresql.org/docs/current/mvcc.html
- Transaction Isolation: https://www.postgresql.org/docs/current/transaction-iso.html
- Using EXPLAIN: https://www.postgresql.org/docs/current/using-explain.html
- Roles and Privileges: https://www.postgresql.org/docs/current/user-manag.html
- Backup and Restore: https://www.postgresql.org/docs/current/backup.html
- Routine Vacuuming: https://www.postgresql.org/docs/current/routine-vacuuming.html
