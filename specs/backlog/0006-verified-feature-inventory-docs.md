# Backlog: Verified feature inventory and data model in the docs

| Metadata | Value |
| --- | --- |
| ID | BACKLOG-0006 |
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

The technical depth removed from the landing (the inventory of 52 features and the database architecture page) belongs in the docs, as proof. Publish it in the docs in three languages after each statement is verified against the code.

## Perceived Problem

The removed blocks held statements that were never verified (for example "compliant" deletion, "zero cold starts", "<10ms", the count of tables) and cannot be moved to the docs as they were; the docs already cover the main features but have no single verified inventory.

## Affected or Benefited Person

Developers who want proof before buying, and the owner who must answer for every statement.

## Expected Result or Value

A docs page per language that lists what the code contains, each line checked against a file, with the statements that cannot be verified left out.

## Context

Follows SPEC-0003 (landing refactor). The old text is in the git history of `apps/web/i18n/locales/*.json` (`landing.comparison`, `landing.databaseArchitecture`) and is a starting list, not a source of truth.

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
