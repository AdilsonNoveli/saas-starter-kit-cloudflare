# Performance Engineering Standards and References

## Methodology

1. Define the SLO / performance budget before optimizing — without a target,
   "improvement" lacks a stopping condition.
2. Measure the baseline under representative conditions before changing any code.
3. Formulate a hypothesis regarding the responsible boundary, backed by time
   decomposition, not intuition.
4. Alter a single relevant factor at a time; composite changes prevent knowing
   which one produced an effect.
5. Measure again under identical baseline conditions and compare the entire
   percentile distribution, not merely the mean.

## Web Vitals (Public Thresholds)

| Metric | Good | Needs Improvement | Poor | What it Measures |
|---|---|---|---|---|
| LCP (Largest Contentful Paint) | ≤ 2.5s | 2.5s–4s | > 4s | Time until the largest visible element renders |
| INP (Interaction to Next Paint) | ≤ 200ms | 200ms–500ms | > 500ms | Responsiveness to interactions across the session |
| CLS (Cumulative Layout Shift) | ≤ 0.1 | 0.1–0.25 | > 0.25 | Visual stability (layout shifts) |

Measure at the 75th percentile of real user sessions (field data), not only in lab
environments — real network and device conditions diverge significantly from local development.
INP has superseded FID (First Input Delay) as the official Core Web Vitals responsiveness metric.

## Metrics by System Type

- **API/Backend**: latency at p50/p95/p99 (never just average), throughput (req/s),
  error rate, resource saturation (CPU, memory, connection pools).
- **Asynchronous Jobs**: queue age (time between enqueue and process start), processing
  duration, retry rate, completion vs failure rate.
- **Database**: query execution time, buffers read (cache hits vs disk reads), lock
  wait times, rows examined vs returned (selectivity).

## Load Testing: Types and What Each Proves

| Type | Question Answered | How to Conduct |
|---|---|---|
| Load test | Does the system handle expected load within the SLO? | Constant load at the expected peak level |
| Stress test | Where does the system break and how does it degrade? | Increase load beyond expected capacity until failure |
| Soak test | Does the system leak resources or degrade over time? | Moderate load sustained over multiple hours |
| Spike test | Does the system recover gracefully from a sudden spike? | Normal load, abrupt spike, return to normal |

Always define success criteria and safety boundaries before executing against shared
environments — poorly isolated stress tests can compromise production services.

```bash
# k6: load test with virtual users and sustained duration
k6 run --vus 50 --duration 5m load-test.js

# ab (Apache Bench): simple throughput/latency against a single endpoint
ab -n 10000 -c 100 https://staging.example.com/api/route
```

## Queueing Theory (Qualitative)

- **Little's Law**: In a stable system, `L = λ × W` (average items in system =
  arrival rate × average time spent in system). Use this to verify consistency
  among measured metrics — if observed queue depth/concurrency is substantially
  higher than predicted by `λ × W`, unaccounted backpressure exists.
- Approaching resource saturation (CPU, connection pool, thread pool), waiting
  queues grow non-linearly: a slight load increase yields a disproportionate latency
  spike. Capacity headroom is not just cost padding; it keeps the latency curve
  within predictable boundaries.
- Maximum throughput measured in a load test only holds for the specific request
  profile tested (endpoint mix, payload size, cache hit rate); do not extrapolate
  that figure to real mixed production traffic without measuring actual usage patterns.

## Profiling: Selecting Tools by Boundary

- CPU-bound (application): runtime sampling profiler (e.g., Vue Devtools Performance
  tab for render profiling, native language CPU profiler for backend).
- I/O-bound (network, disk): tracing external calls and measuring round-trips;
  bottlenecks are frequently serial call chains rather than individual call duration.
- Database: `EXPLAIN (ANALYZE, BUFFERS)` to decompose query planning, execution,
  buffer hits, and physical I/O.
- Always warm up before measuring when runtimes feature JIT, page caches, or
  connection pools — initial runs measure startup overhead, not steady-state performance.

## Sources

- Web Vitals: https://web.dev/articles/vitals
- INP in detail: https://web.dev/articles/inp
- User Timing API: https://www.w3.org/TR/user-timing/
- Navigation Timing API: https://www.w3.org/TR/navigation-timing-2/
- k6 (load testing): https://grafana.com/docs/k6/latest/
- PostgreSQL EXPLAIN: https://www.postgresql.org/docs/current/using-explain.html
- Vue Devtools: https://devtools.vuejs.org/
- Brendan Gregg, USE Method: https://www.brendangregg.com/usemethod.html
- Brendan Gregg, Systems Performance: https://www.brendangregg.com/systems-performance-2nd-edition-book.html
