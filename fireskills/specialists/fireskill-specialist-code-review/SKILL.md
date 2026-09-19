---
name: fireskill-specialist-code-review
description: Review diffs, branches, and PRs for contract adherence, correctness, security, architecture, test quality, and operational risk, reporting findings categorized by severity with precise location and evidence. Use when reviewing code, providing a second opinion on changes, or assessing diff risk; read-only unless explicit fix requested; do not use to design architecture from scratch (use `$fireskill-specialist-software-architecture`).
---

# Code Review

## When to Use

- Trigger when concrete diffs, branches, or PRs need evaluation prior to merging or release.
- Trigger when asked for a "second opinion" on already implemented changes.
- Do not trigger to design foundational architecture from scratch — use
  `$fireskill-specialist-software-architecture`; review evaluates implemented decisions, it does not invent them.
- Combine with `$fireskill-specialist-application-security` when diffs touch auth, sensitive
  data, or untrusted inputs, and with `$fireskill-specialist-domain-modeling` when findings involve ambiguous domain concepts or invariants.

## Workflow

1. Fix the comparison baseline and exact diff scope; reviewing without a clean base produces
   findings on unrelated code.
2. Read the spec, issue, acceptance criteria, and project guidelines before judging;
   without them, "correctness" degrades to subjective opinion.
3. Map every changed file to its affected behavior and boundaries (data, permissions, API contract, config, dependencies).
4. Evaluate correctness, edge cases, security, concurrency, and operational impact before
   style — style only blocks when automation fails to cover it.
5. Inspect tests for the evidence they provide: would they fail without this fix, or do they
   merely execute lines without asserting behavior?
6. Verify suspected defects against real callers and consumers before reporting — minimizes false positives.
7. Report findings by severity, with exact location (`file:line`), trigger condition, impact,
   and recommended remediation.

## Core Rules

- Prioritize real defects and concrete risks; do not elevate personal style preferences to blockers.
- Every finding must describe input conditions, observable consequences, and concrete evidence (line, test, log).
- Consider backward compatibility, concurrency, rollback strategies, and operational observability, not just happy paths.
- Verify that tests fail when the fix is removed — tests passing before and after prove nothing.
- Distinguish missing PR scope (merge blocker) from optional future improvements (advisory comments).
- Do not duplicate findings covered by linters, formatters, or type checkers.
- Explicitly state "no findings under this lens" when appropriate, without claiming complete absence of risk beyond observations.

## Antipatterns

- Blocking for variable naming or formatting preferences when linters exist for that purpose.
- Raising issues without executable reproduction or clear rationale.
- Omitting location citations (`file:line`).
- Silently glossing over large PRs with superficial reviews.

## Validation

- Every critical or high severity finding includes reproduction conditions and specific file:line citations.
- Suggested remediations preserve existing tests and adhere to repository architecture.
- Follow Conventional Comments labels (`suggestion`, `nit`, `issue`) to keep blocking criteria transparent.
