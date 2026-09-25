# Backlog: App interface text governed by the copy specialist

| Metadata | Value |
| --- | --- |
| ID | BACKLOG-0002 |
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

The dashboard, the login app and the layers write their interface text directly in Vue templates, in English only. Move it to locale files under the copy specialist, then localise it.

## Perceived Problem

About 285 literal strings in apps/app, apps/login and layers/* sit outside any locale file and no copy owner; the locale files of those packages have zero or one key.

## Affected or Benefited Person

Users of the SaaS dashboard, in any language, and the developers who maintain it.

## Expected Result or Value

Every interface string is a locale key written through fireskill-specialist-copywriting, and check:copy has no baseline entry left for these files.

## Context

check:copy grandfathers the current literals as dated allowances owned by this item; the list can only shrink.

Found while writing the specialist (2026-09-25): `getErrorMessage` in `apps/app/shared/utils/error-message.ts` falls back to the English text "Something went wrong", which is the generic message the copy specialist asks not to show and is not localised; the same helper passes through the raw `message` of whatever was thrown. The errors the apps show need messages written for the situation, in the three languages.

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
