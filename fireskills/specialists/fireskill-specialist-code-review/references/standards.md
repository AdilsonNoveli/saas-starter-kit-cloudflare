# Code Review Standards and References

## Review Lenses in Priority Order

1. **Contract**: Does the change accomplish what the spec/issue defines? Does it satisfy
   all acceptance criteria, not just the happy path in the title?
2. **Correctness**: Possible states, error handling, boundaries (empty, null, max, negative),
   and concurrency (concurrent requests, competing writes).
3. **Security**: Crossed trust boundaries, identity used to authorize (not just authenticate),
   sensitive data in logs or responses.
4. **Design**: Data and behavior ownership, introduced coupling, dependency direction
   (stable modules pulled by volatile ones).
5. **Operations**: Reversible migrations, documented configuration, adequate telemetry
   for production diagnosis, rollback strategy.
6. **Evidence**: Do tests fail without the fix? Do types and static checks enforce invariants,
   or do they rely on manual discipline?

Review strictly in this order: a critical correctness flaw matters far more than any
style preference, even if style is easier to comment on.

## PR Sizing and Review Depth

- Large PRs (generally above ~400 lines of effective diff, excluding generated files and lockfiles)
  significantly reduce defect detection rates. When a PR is too large to review confidently,
  that size is itself a finding to report, not something to absorb through superficial inspection.
- Filter out lockfiles, generated assets, and automated formatting before estimating review depth.
- Small, focused PRs allow deep inspection across all 6 lenses; large PRs force prioritization —
  explicitly declare which lenses were deeply audited and which were only verified superficially.

## Severity Scale

- **Critical**: Security exploit, data loss or corruption, widespread outage probable. Always blocks merge.
- **High**: Incorrect behavior relevant to users or business, lacking existing mitigation. Merge blocker by default.
- **Medium**: Limited-scope failure or technical debt with measurable localized impact. May be converted to a tracked follow-up issue with owner and deadline.
- **Low**: Robustness, readability, or maintainability improvement with demonstrable value. Advisory comment, never a blocker.

## Finding Format

Every reported finding requires these four components:

- **Location**: Exact `file:line` or line range.
- **Condition**: The input, sequence, or state triggering the problem.
- **Consequence**: What breaks, and for whom (user, operations, downstream systems) — not merely "this is wrong".
- **Evidence or Proposed Fix**: Reproducing test, observed log, or concrete remediation direction.

Style and preference notes use the same structure, labeled as `nit` (following Conventional Comments)
to clarify they do not block merging.

## Test Review as Part of Code Review

- A test passing both before and after a change proves nothing about the change — verify
  the test fails when the implementation fix is reverted.
- Tests executing functions without assertions on relevant outcomes count as absence of tests,
  not test coverage.
- Prefer domain behavior tests (Given X, When Y, Then Z) over line-by-line implementation
  mirroring — the latter breaks during refactors without catching true regressions.

## Authoritative Documentation

- Google Engineering Practices (Code Review): https://google.github.io/eng-practices/review/
- Google Engineering Practices (How to Write CLs): https://google.github.io/eng-practices/review/developer/
- OWASP Code Review Guide: https://owasp.org/www-project-code-review-guide/
- Conventional Comments: https://conventionalcomments.org/
- SEI CERT Coding Standards: https://cmu-sei.github.io/secure-coding-standards/
