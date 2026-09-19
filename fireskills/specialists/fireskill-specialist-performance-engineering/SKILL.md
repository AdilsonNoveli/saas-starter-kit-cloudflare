---
name: fireskill-specialist-performance-engineering
description: "Diagnose and improve performance with budgets, measurement, profiling, load testing, Web Vitals, and regression guardrails. Use for latency, throughput, resource usage, bundle size, or capacity questions; also use to review whether a proposed optimization has a measured baseline and hypothesis; never optimize without measuring first, and for designing production health monitoring signals use `$fireskill-specialist-observability`."
---

# Performance Engineering

## When to Use

- Trigger when there are reports of sluggishness, low throughput, excessive resource
  usage, large bundle size, or capacity questions for an expected peak.
- Also trigger to review an already proposed optimization and confirm whether it has
  a measured baseline and hypothesis, or is merely intuition.
- Do not trigger to design production metrics and alert systems themselves — use
  `$fireskill-specialist-observability` for that; here the focus is diagnosing and
  resolving a specific observed or suspected performance bottleneck.
- Combine with `$fireskill-specialist-postgres` when the bottleneck is in query/index,
  and with `$fireskill-specialist-delivery-engineering` when the fix needs an automated
  guardrail in the pipeline.

## Workflow

1. Define the user journey, metric, target percentile, expected load, and performance
   budget before touching any code.
2. Reproduce the problem in an environment with representative data volume — never
   diagnose based on a tiny development dataset.
3. Measure the current baseline and decompose time across boundaries (client, network,
   application, database, external dependencies) to understand where time is spent.
4. Formulate a specific hypothesis and use the profiler/tracer tailored to the identified
   boundary, rather than making generic optimization guesses.
5. Change a single relevant factor at a time and measure again under the identical
   baseline conditions.
6. Verify that the fix preserves functional correctness under realistic load, timeouts,
   and retries — an optimization that breaks under concurrency is not an optimization.
7. Create an automated guardrail (performance regression test, pipeline budget) that
   prevents the regression from returning unnoticed.

## Patterns

- Use percentiles (p50, p95, p99) and the complete distribution, never just averages
  — averages hide the long tail that most harms real user experience.
- Explicitly separate client, network, application, database, and external dependency
  latencies before deciding where to optimize.
- Measure both cold cache and warm cache, under realistic concurrent conditions,
  not just single isolated requests.
- Do not add caching layers before proving the cost of the uncached path and defining
  an explicit invalidation strategy — cache is the most frequent source of stale-data
  bugs when introduced without proof.
- Preserve correctness under load, timeouts, and retries: an optimization that lowers
  average latency but introduces race conditions or drops retries is unacceptable.
- Control for observer effect (the profiler or instrumentation itself skewing the
  measured result) and ensure warm-up before measuring JIT, disk cache, or connection pools.
- Define capacity and headroom based on realistic expected peak scenarios, not current
  average traffic.

## Anti-Patterns

- Optimizing based on "this feels slow" without a measured baseline: without before-and-after
  numbers, it is impossible to know whether the change helped, had no effect, or worsened
  another percentile.
- Adding indexes, caching, or parallelism to address a symptom without identifying the
  actual bottleneck boundary: solves the synthetic benchmark in test environments but
  does not move production metrics, or shifts the bottleneck elsewhere without reducing
  perceived latency.
- Comparing averages between versions instead of identical percentile distributions under
  the same load: an improved average can conceal a severely degraded p99 tail.
- Scaling hardware/replicas before investigating N+1 queries, serial calls that could be
  parallelized, or avoidable network round-trips — the most common cause of web system
  sluggishness is excessive round-trips, not CPU starvation.

## Validation

- Repeatable benchmark with archived baseline data (not informal notes) for future
  comparison.
- CPU, memory, I/O, or query profiling matching the evidence from the decomposition step,
  rather than running generic profilers "just in case".
- Load testing with explicit success criteria (target percentile under target load) and
  safe thresholds to avoid impacting production during testing.
- Automated regression gates in CI/CD, with sensitivity proportional to historical metric
  stability — noisy metrics require wider margins to avoid constant false alarms.
- Do not declare a change "faster" without a rigorous before/after baseline under identical
  conditions; "feels faster" is never acceptable evidence.

## Related Skills

- `$fireskill-specialist-debugging` isolates functional defects that surface under load
  without conflating them with optimization opportunities.
- `$fireskill-specialist-software-architecture` handles structural redesigns when
  architectural boundaries, rather than local implementations, limit capacity.
- `$fireskill-specialist-web-api-design` preserves retries, pagination, and contracts
  during throughput and latency optimizations.
- `$fireskill-specialist-observability` for signal systems that detect production degradation
  before it escalates into an incident.
- `$fireskill-specialist-postgres`, `$fireskill-specialist-drizzle`, and
  `$fireskill-specialist-cloudflare-workers` when the bottleneck resides in queries,
  indexes, Worker I/O, or cache strategies (KV/Cache).
- `$fireskill-specialist-delivery-engineering` to convert performance guardrails into
  automated pipeline quality gates.

Read [references/standards.md](references/standards.md) for Web Vitals,
benchmarking methodology, load testing, profiling, and performance budgets with official sources.
