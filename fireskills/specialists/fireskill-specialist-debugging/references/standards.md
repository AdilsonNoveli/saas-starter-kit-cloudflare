# Debugging Standards and References

## Isolation Techniques from Least to Most Expensive

- **Bisection** (`git bisect`, or binary search across configuration/data states):
  locates the minimum change introducing a failure in `O(log n)` steps across `n` candidate commits.
- **Differential Debugging**: systematically compare failing vs passing environments,
  holding all variables constant except one per round (versions, configs, data, sequence, load).
- **Delta Debugging**: reduce the failing reproduction case by removing components and
  testing whether failure persists, until reaching the minimal failing input.
- **Distributed Tracing**: follow a `trace id` across service boundaries to identify where
  causality diverges from expectations.
- **Profiling**: measure where runtime, memory allocations, or CPU cycles are actually consumed
  prior to proposing optimizations.
- **Fault Injection**: introduce controlled failures (latency, errors, network partitions)
  to confirm dependency assumptions in authorized non-production environments.

## Common Categories of Flakiness

- **Concurrency**: race conditions between operations assuming uncoordinated ordering;
  missing locks or synchronization on shared state.
- **Timing**: overly tight CI timeouts, unmocked system clocks or timezones, hardcoded `sleep`
  instead of polling conditions.
- **Shared State**: tests dependent on execution order, residual state from prior tests,
  unreset global caches or singletons.
- **External Dependencies**: unisolated networks, third-party APIs, or shared test databases
  experiencing concurrent contention.
- **Uncontrolled Non-Determinism**: unseeded pseudorandom generators, UUID generation, or
  timestamps in tests.

## Symptom vs Cause: Where to Look

- The point where an exception throws or an error logs is rarely the origin — it is where
  the side effect of an earlier corrupted state manifests. Trace backward: what code produced the invalid state?
- For state corruption bugs, ask "who wrote to this last?" before asking "who read it last?".
- In post-deploy regressions, compare the exact release diff, not merely the time window.

## Tooling by Environment

- Node.js / Browser: `--inspect` + Chrome DevTools, `node --prof` for CPU profiling, `console.trace()`.
- Python: `pdb` / `breakpoint()`, `cProfile` for CPU, `tracemalloc` for memory, `faulthandler` for deadlocks.
- Databases: `EXPLAIN (ANALYZE, BUFFERS)` in Postgres for slow queries; `pg_stat_activity` for locks.
- Distributed Systems: OpenTelemetry distributed traces, log correlation via `trace_id`.

## Diagnostic Report Structure

Upon completing diagnosis, record:
- Observed symptom and environment
- Minimal reproduction steps / script
- Evaluated and discarded hypotheses with evidence
- Root cause described at mechanism level
- Supporting evidence (logs, traces, diffs)
- Regression test case

## Authoritative Documentation

- git-bisect: https://git-scm.com/docs/git-bisect
- Chrome DevTools (Debugging JS): https://developer.chrome.com/docs/devtools/
- Python `pdb`: https://docs.python.org/3/library/pdb.html
- Python `cProfile`/`profile`: https://docs.python.org/3/library/profile.html
- PostgreSQL Monitoring & `pg_stat_activity`: https://www.postgresql.org/docs/current/monitoring.html
- PostgreSQL `EXPLAIN`: https://www.postgresql.org/docs/current/using-explain.html
- OpenTelemetry Traces: https://opentelemetry.io/docs/concepts/signals/traces/
