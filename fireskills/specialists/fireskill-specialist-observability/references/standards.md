# Observability Standards and References

## The Three Pillars and What Each Solves

| Pillar | Answers | Does Not Replace |
|---|---|---|
| Structured Logs | "What exactly happened in this specific event?" | Does not show aggregated trends or multi-service paths without correlation |
| Metrics | "How is the system behaving over time, in aggregate?" | Does not explain the individual event that caused a spike |
| Traces | "Where did this request travel and where was time spent?" | Not cheap enough to retain 100% at high volume; relies on sampling |

A typical incident uses all three in sequence: the metric detects deviation, the trace isolates the responsible service or step, and the log explains the exact event.

## Dashboard Frameworks

- **RED** (per request/service): **R**ate (request rate), **E**rrors (error rate),
  **D**uration (latency, in percentiles). Ideal for request-driven services (APIs, web).
- **USE** (per resource): **U**tilization, **S**aturation, **E**rrors. Ideal for
  finite resources (CPU, memory, connection pools, disk).
- Combine both: RED at the service level to detect user impact, USE at the resource
  level to locate bottlenecks once RED indicates degradation.

## SLI, SLO, and Error Budgets

- **SLI** (Service Level Indicator): the measured metric (e.g., proportion of
  requests served under 300ms).
- **SLO** (Service Level Objective): the acceptable target for the SLI over a time
  window (e.g., 99.9% of requests over 30 days).
- **Error budget**: the complement of the SLO (0.1% in the example above) representing
  how much failure the service can "spend" before violating objectives; an exhausted
  budget is a signal to prioritize reliability over new features, not just a decorative
  number on a dashboard.
- Define SLOs per critical user journey, not per isolated infrastructure metric —
  "CPU below 80%" is not an SLO; it is a saturation signal that may or may not impact
  the real user SLO.

## Signals by Component Type

- **Request/API**: throughput, error rate by status code, duration at p50/p95/p99,
  connection pool saturation.
- **Queue/Messaging**: queue depth, age of oldest message, consumer throughput,
  retry rate, dead-letter rate.
- **Database**: active connections vs pool limit, locks and wait times, query
  latency, error rate, replication lag.
- **Cache**: hit rate, hit vs miss latency, eviction rate, memory utilization,
  connection failures.
- **Deployment**: running version per instance, rollout progress, health checks,
  pre/post deploy error rate comparison.

## Cardinality and Cost

- Cardinality of a metric is the Cartesian product of possible values across each
  label; a label with 10 values and another with 1,000 generates up to 10,000 series
  for that metric alone.
- Never use as labels: user IDs, emails, unnormalized URLs (with IDs or query
  strings), arbitrary freeform error messages. Normalize routes (`/users/{id}`,
  not `/users/123`) before using them as labels.
- Treat cardinality as an explicit budget: review before adding a new label to a
  high-volume metric, not after the metrics backend has already degraded.

## Correlation and Distributed Context

- Propagate trace context (W3C Trace Context: `traceparent`/`tracestate`) across
  all synchronous boundaries (HTTP) and asynchronous boundaries (queue messages,
  scheduled jobs) so that a single trace spans the complete journey.
- Sampling: preserve 100% of error traces and transactions marked as critically
  important to the business; apply statistical sampling only to high-traffic
  happy paths.

## Primary Sources

- OpenTelemetry (instrumentation): https://opentelemetry.io/docs/
- Semantic conventions (standardized attribute names): https://opentelemetry.io/docs/specs/semconv/
- W3C Trace Context: https://www.w3.org/TR/trace-context/
- Prometheus practices (metric naming and cardinality): https://prometheus.io/docs/practices/
- Google SRE Book — SLOs: https://sre.google/workbook/implementing-slos/
- Google SRE Book — Monitoring Distributed Systems (RED/USE in practice): https://sre.google/sre-book/monitoring-distributed-systems/
- OpenMetrics (exposition format): https://openmetrics.io/
- Brendan Gregg, USE Method: https://www.brendangregg.com/usemethod.html
