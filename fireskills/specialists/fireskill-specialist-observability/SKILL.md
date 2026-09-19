---
name: fireskill-specialist-observability
description: "Design and review logs, metrics, traces, correlation, SLOs, alerts, and dashboards to explain system behavior. Use when the task involves instrumentation, incidents, telemetry, or operations; also use to define the signal that decides a rollout or triggers an alert; do not confuse log volume with observability, and for diagnosing specific latency root causes use `$fireskill-specialist-performance-engineering`."
---

# Observability

## When to Use

- Trigger when the request involves instrumentation (logs, metrics, traces),
  incident investigation, SLI/SLO definition, or dashboard/alert construction.
- Also trigger to define the objective signal that authorizes proceeding, pausing,
  or rolling back a deployment rollout.
- Do not trigger to diagnose the root cause of a specific already detected
  latency — use `$fireskill-specialist-performance-engineering` for
  profiling and optimization; observability here focuses on designing the signal
  system, not on investigating a single already instrumented case.
- Combine with `$fireskill-specialist-delivery-engineering` when the signal
  defined here decides a rollout `failure_action`.

## Workflow

1. Define real operational questions ("is checkout functioning for the user?")
   and critical user journeys before choosing any tooling.
2. Establish SLIs (measurable indicators) and SLOs (acceptable target) with an
   explicit error budget whenever service criticality justifies it.
3. Map trust and system boundaries (HTTP, queue, background job, database) and the
   correlation context that must traverse them (trace ID, request ID).
4. Instrument events, metrics, and spans with controlled cardinality by design,
   not as an afterthought.
5. Protect sensitive data in telemetry (redaction, masking) and define retention
   policies by signal category.
6. Build dashboards organized by decision (what does this view help me decide?)
   and alerts organized by action (what do I do when this alert fires?).
7. Validate telemetry across all three states — success, failure, and partial
   degradation — before relying on it during an active incident.

## Patterns

- Structured logs (key-value or JSON) with named event, severity, correlation
  identifier, and minimum necessary context — never an arbitrary concatenated
  string that requires regex parsing to extract data.
- Metrics only use labels with bounded, known cardinality (normalized endpoint,
  status code, tenant if tenant count is small); never user IDs, raw URLs with
  query strings, or raw error messages as labels — every unique label value
  multiplies stored time series.
- Traces preserve the same correlation context across HTTP, message queues, and
  asynchronous jobs — a trace that breaks at the edge of a queue cannot debug
  the most common problem (distributed latency across services).
- Alerts reflect real user impact or imminent risk of SLO violation, and every
  alert has an owner and an accessible runbook — an alert without an associated
  action is noise that conditions the team to ignore alerts.
- Dashboards start from an aggregated health view (RED/USE) and enable drill-down
  to granular signals, not the reverse.
- Trace sampling preserves 100% of errors and critical business transactions,
  even when downsampling high-volume happy paths.
- Telemetry itself fails safely (degrades gracefully, never brings down the product)
  — an offline metrics exporter must never crash the application it instruments.

## Anti-Patterns

- "Log everything" without structure or consistent severity levels: increases
  storage costs and diminishes the real ability to find relevant events during
  an incident — log volume is not observability.
- Metrics with high-cardinality labels (e.g., `user_id` or `order_id` as a
  label): explodes time series storage and can drastically degrade or inflate
  the cost of the metrics backend.
- Alerts configured on cause metrics rather than symptom metrics (e.g., alerting
  on "high CPU" instead of "error rate / latency exceeding SLO"): produces noise
  during benign spikes and does not necessarily reflect real user impact.
- Dashboards that exist only because "it seemed useful at the time", without
  periodic review: accumulates obsolete panels that compete for attention with
  panels that truly matter during an incident.

## Validation

- Generate end-to-end telemetry in a controlled scenario and confirm that
  correlation (trace ID) traverses all mapped boundaries.
- Verify projected cardinality, estimated cost, configured retention, and ensure
  sensitive fields undergo redaction before leaving the service.
- Confirm that configured alerts actually fire in the intended scenario (test
  or simulation) and that the linked runbook is actionable by someone who did
  not write the code.
- Run, against a known failure scenario, the queries the team would use during
  a live incident, confirming they return the expected signal within useful time.
- Do not declare a system "observable" merely because a dashboard exists; proof
  requires the team being able to answer the original operational question
  using telemetry alone, without direct code or database access.

## Related Skills

- `$fireskill-specialist-debugging` consumes signals to isolate root causes and
  requests additional instrumentation when evidence is insufficient.
- `$fireskill-specialist-postgres` and `$fireskill-specialist-cloudflare-workers`
  produce data, queue, and cache signals (Workers Logs/Traces) with cardinality
  and retention governed here.
- `$fireskill-specialist-web-api-design` defines correlation and errors in the
  contract; this skill measures endpoint operational behavior.
- `$fireskill-specialist-performance-engineering` for diagnosing root causes of
  latencies or bottlenecks already detected by signals defined here.
- `$fireskill-specialist-delivery-engineering` when the health signal defined
  here informs decisions to continue or roll back a release.
- `$fireskill-specialist-application-security` when telemetry must record (or
  deliberately exclude) security events.

Read [references/standards.md](references/standards.md) for observability
pillars, dashboard frameworks (RED/USE), SLIs/SLOs, and official OpenTelemetry sources.
