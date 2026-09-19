# Specialized Review Lenses

Use the three lenses after structural validation and before promoting a gate.
They produce findings; they do not alter requirements or make decisions on behalf of the user.

## Product and Engineering (`PROD`)

- Purpose, value proposition, and success metrics remain coherent;
- Scope and proposed solution do not mask a divergent underlying problem;
- Failure modes, boundaries, and operational costs define observable behaviors;
- The plan is implementable without unverified material hypotheses.

## Architecture (`ARCH`)

- Principles in section 4 materialize in designs within sections 8–10;
- Declared file paths and architectural boundaries align with the actual codebase;
- Dependencies do not cross layers or team ownership without explicit justification;
- Data schemas, contracts, rollback strategies, and backward compatibility are decided;
- Implementation introduces no architectural drift from the approved plan.

## Security (`SEC`)

Depth scales with financial transactions, authorization, privacy,
irreversibility, and external attack surfaces. Verify:

- Authentication, resource-level authorization, and tenant isolation;
- Data classification, retention rules, sanitization in logs, and leak prevention;
- Trust boundaries, input validation, and output encoding;
- Secrets management, third-party dependency risks, abuse protection, rate limiting, and availability;
- Audit logging, revocation, rollbacks, and fault recovery.

## Finding Contract

Record in section 13:

```text
- **FIND-ARCH-001** [P1] [Open] description — Refs: FR-001 — Evidence: path:line — Effect: effect — Suggestion: fix
```

- Lenses: `PROD`, `ARCH`, `SEC`.
- Severities: `P1`, `P2`, `P3`.
- Statuses: `Open`, `Resolved`, `Accepted`.
- IDs are unique; `Refs` must exist in the spec and `Evidence` must resolve to an existing local file within the project root.
- Any `P1 Open` finding blocks the gate.
- `Accepted` requires recorded user rationale; `Resolved` requires concrete proof of the fix.

Validate with:

```bash
node fireskills/skills/fireskill-04-validate/scripts/review_findings.mjs \
  specs/<state>/<NNNN>-<slug>/spec.md
```
