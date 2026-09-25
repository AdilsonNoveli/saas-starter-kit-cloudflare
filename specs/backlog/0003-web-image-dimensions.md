# Backlog: Image dimensions and weight outside the landing

| Metadata | Value |
| --- | --- |
| ID | BACKLOG-0003 |
| Status | Captured |
| Product | To be clarified |
| Epic | To be clarified |
| Feature | To be clarified |
| Type | To be clarified |
| Priority | Unprioritized |
| Milestones | |
| Created at | 2026-09-25 |
| Promoted spec | None |

## Original Idea

Give every img of the blog covers, the docs screenshots, the header logo and the architecture diagrams a numeric width and height, and reduce the weight of the largest documentation image.

## Perceived Problem

check:perf reports about 35 images without width and height (layout shift) and one documentation PNG above the 200000-byte maximum.

## Affected or Benefited Person

Readers of the blog and the docs on slow connections.

## Expected Result or Value

check:perf has no img-dimensions or img-max-bytes allowance left for these images.

## Context

These allowances are grandfathered by check:perf with this item as their owner.

## Related References

- No relevant references found.

## Expected Behavior

To be clarified.

## Business Rules

- To be clarified according to risk and complexity.

## Acceptance Criteria

- To be clarified before considering the item refined.

## Qualities and Operation

- Security: to evaluate.
- Privacy: to evaluate.
- Performance and volume: to evaluate.
- Audit and observability: to evaluate.

## Dependencies

- None registered.

## Error Situations

- To be clarified.

## Scope

- In scope: to be clarified.
- Out of scope: to be clarified.

## Questions, Decisions, and Risks

- None registered.

## Ready for Development

- [ ] The problem and benefited person are clear.
- [ ] The initial trigger and expected result are clear.
- [ ] Permissions, rules, and relevant exceptions are clear.
- [ ] The result can be objectively verified.
- [ ] Security, privacy, and performance were evaluated according to risk.
- [ ] Out of scope, dependencies, and pending decisions are recorded.

## Next Step

Refine in this stage until the item is ready for `$fireskill-03-specify`.
