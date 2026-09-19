---
name: fireskill-02-backlog
description: "Use when the user wants to turn an inbox capture from `specs/inbox/`, an opportunity, a problem, or an existing item into a backlog ready for specification, including via automatic transition. Searches duplicates and references, creates or updates `specs/backlog/`, asks adaptive questions, applies MCR-10, and produces a testable brief. To simply store text without questions use fireskill-01-inbox; do not use to write spec.md, tasks, tests, or implementation."
---

# Refine and Deepen the Backlog

## Mandatory Preparation

Before executing this skill, you must load `$fireskill-setup` at the project root.
On automatic handoff, reload it before this step.
Reuse the root confirmed in conversation and do not proceed if setup reports a pending blocker.

## Interaction Mode

Interaction mode: `questions`.
Before formulating any question, read and apply the `Numbered Questions Protocol` from `fireskills/skills/Spec.md`.

Transform a vague input into an intelligible backlog item and, when intent requires specification,
deepen decisions until producing a testable brief. This is the second sequential stage of the framework.
It unifies capture, refinement, and discovery without turning backlog into a normative source of truth.

## Orchestrating the Conversation

When concluding this stage or detecting work belonging to another stage, announce
`Pending blocker detected: <description> — action: resolving in this stage` and resolve it
if it falls within scope. When responsibility transfers, announce
`Automatic transition: $fireskill-02-backlog → $<target> — reason: <reason> — expected result: <result>`
and immediately load the destination skill, without asking for confirmation or repeating the command. Continue in the same conversation.

After a necessary fix in this stage, announce
`Automatic resumption: $<target> → $fireskill-02-backlog — resolved blocker: <result>`
and resume immediately. Re-evaluate state after each handoff to prevent cycles. Handoffs do not require confirmation; sensitive actions still require explicit authorization.

## Search Duplicates and References

1. Extract terms derived from the user request, including domain terms and obvious equivalents already used in conversation.
2. Before creating or updating the item, search these terms in:
   - `specs/inbox/*.md`;
   - `specs/backlog/*.md`;
   - `specs/<state>/*/spec.md`;
   - `docs/**/*.md`.
3. Inspect only plausible results and classify each relation:
   - **possible duplicate**: problem, person, result, and context substantially identical;
   - **related backlog**: complementary item, dependency, or precedent;
   - **related spec**: defined or delivered behavior that bounds the item;
   - **related documentation**: project vocabulary, rule, or context.
4. Present substantive matches with their paths. In case of a possible duplicate, confirm with the user whether to update the item or record a real distinction.
5. Record useful sources in `Related references`, with relative path and relation type. Do not turn a discovered decision into a user assertion.

If a response materially shifts terms, problem, person, result, or context, repeat the search.

## Reuse Confirmed MVP Answers

When the backlog originates from an MVP milestone derived from `MVP.md`, before formulating any question:

1. Read `specs/milestones/M01.md` and the `Confirmed MVP Records` section of the backlog; also open the original `MVP.md` when the recorded path is available;
2. Extract every statement that answers problem, person, result, scope, journey, rule, data, integration, boundary, or acceptance criterion;
3. Convert the statement into a normalized answer in the applicable backlog field and keep the source excerpt and path as provenance;
4. Treat as answered any question whose answer is explicitly stated in the MVP, even if the file does not use the exact question phrasing;
5. Ask only for genuine gaps, relevant ambiguity, or contradiction between the MVP, related sources, and current conversation.

Do not request confirmation, choice, or reformulation for an answer the MVP already declares. A brief summary can report what was reused, but does not open a new question round. When a reasonable reading admits multiple interpretations, present only that ambiguity and quote the triggering excerpts.

If the import records a `Default applied automatically`, consider it confirmed when the indicated basis is explicit or unequivocal. If a question has only one option compatible with the MVP, apply that option, record normalization, and proceed to the next gap. Only offer choices when there is a real tradeoff, multiple compatible interpretations, or a suggestion that sources do not confirm. The interview should ask only what the MVP could not answer or suggest with certainty.

## Ensure Minimum Capture

1. Preserve the original wording received in conversation or in `specs/inbox/<timestamp>-<slug>.md`. Separate assertions, inferences, and open points.
2. Confirm whether context clarifies:
   - perceived problem;
   - affected or benefited person;
   - expected result or value;
   - sufficient context to distinguish the entry from similar requests.
3. If anything is missing, vague, contradictory, or ambiguous, select the highest-impact genuine gap and construct exactly one numbered question per round.
4. Re-evaluate gaps after each answer. Do not turn items into a rigid questionnaire or repeat already provided information.
5. Do not create or update the file while essential items remain missing or ambiguous. If the user does not know the answer, explain the gap without inventing content.

Minimum capture does not require technical solution, full acceptance criteria, or priority. These details can mature during deepening.

## Create or Update the Item

1. If the user only wants to explore without recording, converse and confirm before writing.
2. If a matching item exists, update it without changing its ID and preserve the prior wording.
3. If originating from `specs/inbox/`, record that path in `Related references`; do not alter or delete the capture.
4. To create a new item, execute:

```bash
node <skill-dir>/scripts/iniciar_backlog.mjs \
  --title "<short title>" \
  --idea "<original formulation>" \
  --problem "<perceived problem>" \
  --person "<affected or benefited person>" \
  --result "<expected result or value>" \
  --context "<context distinguishing the idea>" \
  [--slug <slug>] [--root <root>]
```

5. Use the absolute path printed by the script. It prefers `.fireskills/templates/custom/Backlog.md` and falls back to `.fireskills/templates/Backlog.md`.

## Organize and Prioritize

Read `references/backlog-quality.md` when structuring, refining, prioritizing, or assessing readiness.

- Classify, when known, into Product → Epic → Feature → Item.
- Use types such as epic, story, rule, technical, and improvement without conflating type with priority.
- Order by value, risk, dependencies, urgency, effort, unlocks, and uncertainty; do not label everything high priority.
- Deepen fields based on risk and complexity. Authentication, payments, permissions, privacy, and async operations require greater care.
- Prefer observable behavior over UI implementation choices.
- Make quality attributes measurable when material.
- Use lists, flows, scenarios, or matrices when they reduce ambiguity.

## Deepen for Specification

When the user requests deepening, promotion, or creation of a spec:

1. Read the entry from `specs/inbox/`, the item from `specs/backlog/`, or the indicated spec. If multiple candidates exist, ask which to deepen.
2. Summarize the problem, persona, and perceived outcome in a single sentence.
3. Separate what is decided from what may affect scope, experience, security, data, tests, or architecture.
4. Read `references/discovery-map.md` to select relevant questions; do not traverse the map mechanically.
5. When the deliverable includes user-facing UI, read the `Interface Experience Contract` in `fireskills/skills/Spec.md` and treat `Interface` as a distinct discovery area. Ask about screens, information flow, menus and primary navigation, forms, interaction patterns (such as slideover vs. modal), and layout composition. Do not choose patterns on behalf of the user when real alternatives exist.
   Before asking, inspect the stack and existing screens designated by the central contract. When a system already exists, traverse the affected area and record navigation, components, content, permissions, and states that the new delivery preserves or alters. Use this to offer compatible choices rather than suggesting a new library by default. Requests to create or modify screens, dashboards, lists, forms, visual workflows, or CRUD activate this area, even if the user never uses the word "interface".
   Load `$fireskill-specialist-interface-experience` before concluding this area; it coordinates analysis of the current system and downstream specialists.
   Load `$fireskill-specialist-ux-design` before concluding journeys and `$fireskill-specialist-ui-design` before concluding composition.
   When the stack uses `@nuxt/ui`, all CRUD declared in discovery must record `UTable` (with `enterpriseTableUi`), filters, `UForm`, `UModal` or `USlideover`, and applicable states; load `$fireskill-specialist-nuxt-ui` before concluding the area.
6. Read `../fireskill-03-specify/references/mcr-10.md` and perform the categorical analysis silently before the first question.
7. Read `references/specialists.md` only when technology or discipline requires additional context.

## Conduct Adaptive Discovery

Run a cycle with a maximum of eight questions per area:

1. Before each round, re-read the input, confirmed decisions, accumulated context, and new responses alongside MVP records.
2. Reclassify gaps and dependencies. Continue while applicable gaps remain and questions are within limit; terminate when each is decided, non-applicable, or resolved by evidence.
3. Select the genuine gap with highest `impact × uncertainty` and present the round in accordance with the central contract.
4. Record each original response, the normalized decision, and its consequences. Return to step 1; never use a fixed static queue.

Upon reaching eight questions, present a summary, record open gaps, and pause. Only reopen the cycle when the user explicitly requests more questions and states how many they wish to answer.

Include `Proceed` in every question starting from the first round. If the user selects this option:

- In the following round, confirm whether they definitively close questions for that area, defer answering, or resume answering now;
- Issue this confirmation as the sole numbered question of the round;
- Upon closing, record `Area closed by user: <area>` and do not ask again unless explicitly reopened;
- Upon deferral, record `Area deferred by user: <area>` and preserve unanswered points for later resumption;
- Do not infer answers into blanks;
- Permit the requested handoff, keeping `Status: Draft` and `Definition Gate: Pending` when applicable gaps remain.

During conversation:

- Provide at least three numbered options when reducing cognitive effort, and recommend one with concise rationale;
- Accept freeform responses and incorporate them into re-analysis;
- Preserve original wording and differentiate assertions, inferences, hypotheses, decisions, conflicts, and open items;
- Confirm operational intent through synthesis;
- Do not recite the ten categories or turn each into a question.

Ensure sufficient coverage of problem, actors, outcome, scope, journeys, failure modes, boundaries, rules, data, security, privacy, performance, accessibility, existing constraints, and objective signs of acceptance and success.

For user-facing interfaces, also cover screens, navigation, information flow, menus and primary navigation, form fields and validation, activation patterns for actions, element layout, states, and keyboard usage. Record textual answers and observed stack in the backlog so the spec does not reduce CRUD to raw endpoints or switch technology stacks arbitrarily.

When journeys depend on stored, queried, shared, or deleted data, announce automatic transition to `$fireskill-data-discovery` before declaring the brief ready. Resume backlog with confirmed records in `.fireskills/DATABASE.md` as context, without turning conversation into low-level technical design.

## Maintain the Item

Use exact path `specs/backlog/<NNNN>-<slug>.md` and maintain:

- `Status: Captured` while the item is only recorded;
- `Status: Refining` during refinement or discovery;
- `Status: Ready for specification` when the brief is sufficient;
- `Status: Promoted` once a derived spec exists.

Keep metadata in the table below the title. Never invent priority, deadlines, stakeholders, solutions, or evidence. Use `Ready for Development` as a diagnostic checklist, never as implementation authorization.

## Conclude

Present a `Brief Ready to Specify` containing:

1. Problem and objective.
2. Actors.
3. Scope and out of scope.
4. Essential journeys and rules.
5. Acceptance criteria in Given/When/Then format.
6. Technical and quality constraints.
7. Assumptions.
8. Open decisions or `No applicable gaps`.
9. Ambiguous vocabulary and confirmed inferences.

Update the backlog item when the user authorizes recording. When the brief is sufficient or the user selects `Proceed`, automatically return to `$fireskill-update-spec` if called due to late changes on an approved spec. To create or consolidate initial definition, call `$fireskill-03-specify`. In case of `Proceed` with open items, deliver partial brief and state gaps that block the Definition Gate.

## Boundaries

- Do not modify or delete Inbox entries.
- Do not create `spec.md`, tasks, research, tests, or code.
- Do not fabricate stakeholders, integrations, constraints, or decisions.
- Do not convert technical hypotheses into requirements.
- Do not move or delete existing items without confirmation.
