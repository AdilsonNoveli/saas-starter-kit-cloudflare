# Application Text (labels, buttons, empty states, errors, permission messages, emails, notifications)

Marketing sources do not cover the text inside a product. Two primary sources were read for
errors; the rest of this file is marked as project decision, not as something a source demands,
and says so. Extend it only after reading a source and adding a row.

## 1. Sourced facts

| Id | Fact | Source | Read | Mode |
| --- | --- | --- | --- | --- |
| E1 | Nielsen Norman Group (Neusesser and Sunwall, 2023-05-14), error-message guidelines: show the message close to the error's source; use noticeable, redundant and accessible indicators and never colour or animation alone; design the error by its impact (a warning the person can pass differs from a barrier, and modal dialogs are for severe errors); do not show an error before the person has had the chance to answer. | https://www.nngroup.com/articles/error-message-guidelines/ | 2026-09-25 | RAW |
| E2 | The same article on communication: use human-readable language without jargon, hide or minimise obscure error codes (for diagnostics only), and describe the exact problem concisely and precisely instead of "An error occurred", while avoiding technical precision that undermines understanding. | https://www.nngroup.com/articles/error-message-guidelines/ | 2026-09-25 | RAW |
| E3 | WCAG 2.2 Success Criterion 3.3.3 Error Suggestion (Level AA): when an input error is automatically detected and suggestions for correction are known, provide them, unless that would jeopardise the security or purpose of the content. 3.3.1 Error Identification covers notifying the error; suggestions help people with cognitive or visual disabilities and reduce abandonment of forms. | https://www.w3.org/WAI/WCAG22/Understanding/error-suggestion.html | 2026-09-25 | RAW |

## 2. Conventions for Nuxfire (project decisions, not sourced requirements)

| Id | Convention | Basis | Source | Read | Mode |
| --- | --- | --- | --- | --- | --- |
| C1 | An error message states what happened and, when known, what to do next, next to the field it concerns, in plain words, without blaming the person; it keeps what they typed. | E1, E2, E3 | https://www.nngroup.com/articles/error-message-guidelines/ | 2026-09-25 | DECISION |
| C2 | A technical code or identifier may be shown as a secondary line for support, never as the message. | E2 | https://www.nngroup.com/articles/error-message-guidelines/ | 2026-09-25 | DECISION |
| C3 | A button names the action it performs ("Invite teammate", "Delete workspace"); a destructive button says what is deleted; a confirmation repeats the object. | R5 in headlines-and-buttons.md | fireskills/specialists/fireskill-specialist-copywriting/references/headlines-and-buttons.md | 2026-09-25 | DECISION |
| C4 | An empty state says what belongs here, why it is empty, and offers the one next step; it does not apologise. | project decision | fireskills/specialists/fireskill-specialist-copywriting/SKILL.md | 2026-09-25 | DECISION |
| C5 | A permission message names what the person cannot do and who can (a role, an owner), never just "Forbidden". | project decision | fireskills/specialists/fireskill-specialist-copywriting/SKILL.md | 2026-09-25 | DECISION |
| C6 | A transactional email has one purpose, says it in the subject, states what the recipient did or is asked to do, and carries no marketing claim; text is in the recipient's language. | project decision | fireskills/specialists/fireskill-specialist-copywriting/SKILL.md | 2026-09-25 | DECISION |
| C7 | A notification says who did what to which object and links to it. | project decision | fireskills/specialists/fireskill-specialist-copywriting/SKILL.md | 2026-09-25 | DECISION |
| C8 | Words that carry meaning live in the locale files with the same keys in every language; placeholders are named (`{name}`), plurals use the i18n library's plural forms, and no sentence is built by concatenating fragments. | apps/*/i18n and `check:i18n` | scripts/check-i18n-completeness.ts | 2026-09-25 | DECISION |

## 3. Patterns for inside the product (structures, not sentences)

| Situation | Structure | Example (en) |
| --- | --- | --- |
| Validation error on a field | [what is wrong with what they entered] + [what is accepted] | The email address needs an @ and a domain, like name@company.com. |
| Server or network failure | [what did not happen] + [whether their data is safe] + [what to do] | We could not save your changes. Your edits are still on this page; try again in a moment. |
| Permission | [what they cannot do] + [who can] | Only workspace owners can change billing. Ask an owner to do it. |
| Empty state | [what appears here] + [one next step] | Invoices appear here after your first payment. |
| Destructive confirmation | [verb] [object] + [what cannot be undone] | Delete workspace "Acme"? Its projects and members are removed and this cannot be undone. |
| Success | [what happened] (+ [what changed]) | Teammate invited. They will get an email. |

These are illustrations of the structures of C1 to C7; the example wording is not a fixed string.
Any string that ships is written for its screen, added to the three locale files, and read there.

## 4. What this reference does NOT establish

- Style guides for interface text from GOV.UK, Microsoft, Google or Apple: not read here, so none
  is cited. Read one before adding a stricter rule.
- Rules for accessible names of icon buttons: see `$fireskill-specialist-web-accessibility`. The
  zero-JavaScript spike found buttons in the web header with neither text nor `aria-label`.
- Legal text (terms, privacy): its wording is the owner's and their lawyer's; this specialist covers
  clarity and consistency only.
- Push, SMS or chat-script conventions.
