---
name: fireskill-04-validate
description: "Use when the user asks to validate, review, audit, or check whether `specs/{id}-{slug}/spec.md` strictly follows the Specsfy/2.0 standard and is ready for planning. Also use when an automatic transition requests proof of Definition Gate or re-validation after correction. Use before Act II. Record gates in section 13 of the same file; do not create checklists, reports, plan.md, or other artifacts."
---

# Validate the Specification

## Mandatory Preparation

Before executing this skill, you must load `$fireskill-setup` at the project root.
On automatic handoff, reload it before this step.
Reuse the root confirmed in conversation and do not proceed if setup reports a pending blocker.

## Interaction Mode

Interaction mode: `questions`.
Before formulating any question, read and apply the `Numbered Questions Protocol` from `fireskills/skills/Spec.md`.

Treat `spec.md` as the single source of truth and as code in natural language: first verify structural compliance, followed by semantic clarity, completeness, consistency, and testability.

## Orchestrating the Conversation

When concluding this stage or detecting work belonging to another stage, announce
`Pending blocker detected: <description> — action: resolving in this stage` and resolve it
if it falls within scope. When responsibility transfers, announce
`Automatic transition: $fireskill-04-validate → $<target> — reason: <reason> — expected result: <result>`
and immediately load the destination skill, without asking for confirmation or repeating the command. Continue in the same conversation.

After a necessary fix in this stage, announce
`Automatic resumption: $<target> → $fireskill-04-validate — resolved blocker: <result>`
and resume immediately. Re-evaluate state after each handoff to prevent cycles. Handoffs do not require confirmation; sensitive actions still require explicit authorization.

## Execute Validation

1. Resolve `specs/<state>/<NNNN>-<slug>/spec.md` from the provided path; if multiple specs exist and no slug is provided, ask which to validate.
2. Confirm `Format: Specsfy/2.0`, the three acts in sequence, slug matching parent directory, and package strictly containing `spec.md` and optional `research/`.
3. For every external API or documentation consulted, confirm local evidence in `research/` and its index in `Stored research artifacts`; this material is informative, never a second normative source.
4. While `Status` or `Definition Gate` remains pending, execute:

```bash
node fireskills/skills/fireskill-04-validate/scripts/validate_spec.mjs specs/<state>/<NNNN>-<slug>/spec.md --allow-draft
```

5. Read `references/quality-gates.md` and perform semantic review.
6. Verify `Human Interface` field. If `Yes`, require in section 10: observed stack and conventions, screens and responsibilities, information flow and navigation, menus and primary navigation, forms and actions, composition and layout, states, and accessibility. Verify whether proposed technology adheres to stack sources or if gaps were explicitly recorded. A CRUD without screens and forms is a `BLOCKER`; automatically return to `$fireskill-02-backlog` to clarify the gap.
7. Compare research, requirements, BDD, technical plan, data model, contracts, TDD, matrix, and tasks. Confirm at least three distinct `AC`s for the entire feature and for each `US`, `FR`, and `NFR`; do not confuse "well-formatted file" with "correct specification".
8. When product, architecture, or security is material, read `references/review-lenses.md`, record findings in section 13, and execute `scripts/review_findings.mjs`. Any `P1 Open` finding keeps the gate pending.
9. If definition alters stack or persistence, require the Definition of Done to reference `.fireskills/STACK.md` or `.fireskills/DATABASE.md` respectively. For material shifts in purpose or capabilities, require review of `.fireskills/PROJECT.md`; for new confirmed rules, require `.fireskills/RULES.md`.
10. In final acceptance, inspect `[MIGRATION]` tasks and execute `verify_evidence.mjs --delivery` for each. Keep Delivery Gate pending while the task is open or when migration file, run command, or verification query is missing.

## Classify Findings

- `BLOCKER`: Prevents correct task execution or testing; contradictory requirement, missing observable behavior, omitted high-impact decision, or uncovered primary scenario.
- `WARNING`: Increases rework or risk, but permits safe implementation.
- `NOTE`: Editorial improvement without material impact.

For each finding, cite section or ID, explain impact, and propose concrete resolution.

## Gate

Return exactly one outcome:

- `READY`: No formatting failures and no unresolved `BLOCKER`s.
- `NOT READY`: Any structural failure or `BLOCKER`.

Include counts, minimum coverage `US/FR/NFR ↔ 3 ACs`, top three findings, and automatic transition:

- `READY` → `$fireskill-05-tasks` to plan section 14;
- `NOT READY` → return to `$fireskill-02-backlog` when decisions are missing; backlog refinement executes its full cycle and validation resumes only after closing gaps or receiving explicit user `Proceed`; after `Proceed`, record `NOT READY` and do not reopen the same cycle; when the fix is already decided, use `$fireskill-update-spec` for previously approved specs and `$fireskill-03-specify` for initial drafts.

Announce reason and immediately load the selected skill.

## Record in the Single Spec

Without altering requirements automatically:

1. Update `Act I Gate — Definition` in section 13 with outcome, date, and findings;
2. On `READY`, set `Definition Gate: Passed` and `Status: Defined`;
3. On `NOT READY`, set `Definition Gate: Failed`, `Plan Gate: Pending`, `Delivery Gate: Pending`, and keep `Status: Draft`;
4. Rerun `validate_spec.mjs specs/<state>/<NNNN>-<slug>/spec.md` without `--allow-draft` when the gate passes;
5. Report result in chat.

When Definition Gate passes, execute `bun run fireskill transition <id> defined`.
In `review`, use the same analysis for final acceptance. With Delivery Gate passed, Status `Complete`, and proven DoD, execute `bun run fireskill transition <id> completed`.
Prior to that, invoke `$fireskill-interviewer` when a response may alter delivery or effort.

If the user requests fixes, edit source sections, preserve IDs, and revalidate. Never create duplicate specification or validation files.

## Repository Enforcement

Use the same runner locally and in CI:

```bash
node fireskills/skills/fireskill-04-validate/scripts/verify_repo.mjs . \
  --boundary local --timeout-seconds 300 --max-output-bytes 65536
```

Boundaries `local`, `git`, and `ci` do not alter policy. `--attestation PATH` is the sole mechanism to persist attestations; `--self-test` executes canaries in temporary directories and never creates probative bindings. Schema 2 attestation links commit, executable digest, approved checks, tasks, and file hashes. The digest covers commands, limits, and policy files. Never accept a gate that passes in only one boundary, exceeds limits, or truncates diagnostics without marking `truncated`.

The catalog contract requires all 14 base skills, `fireskill-setup`, `fireskill-documentator`, and the three `fireskill-aux-*` skills; it also validates every installed `fireskill-specialist-*`, without capping total specialists.
Gherkin BDD serves exclusively as specification reference in `spec.md`: enforcement never runs raw `.feature` files. It executes tests derived through Vitest configured in the project (`bun run test`; for single file, `bunx vitest run <file>`).

## Specialists on Demand

Read [references/specialists.md](references/specialists.md) when a gate depends on domain-specific technical review. Specialist installation is an explicit recommendation, never a silent side effect of validation.
