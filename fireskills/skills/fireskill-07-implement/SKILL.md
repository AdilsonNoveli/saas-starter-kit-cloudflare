---
name: fireskill-07-implement
description: "Use when the user asks to implement, execute, or complete tasks in section `14. Tasks` of `specs/{id}-{slug}/spec.md`, write production code specified by the single source of truth, continue the next ready task, or finalize a feature. Also use when an automatic transition initiates or resumes delivery. Use for production code; to create tests only use fireskill-06-tdd-bdd, and to decompose only use fireskill-05-tasks."
---

# Implement Tasks and Write Production Code

## Mandatory Preparation

Before executing this skill, you must load `$fireskill-setup` at the project root.
On automatic handoff, reload it before this step.
Reuse the root confirmed in conversation and do not proceed if setup reports a pending blocker.

## Interaction Mode

Interaction mode: `questions`.
Before formulating any question, read and apply the `Numbered Questions Protocol` from `fireskills/skills/Spec.md`.

Execute section `14. Tasks` in `spec.md` in dependency order, keeping the single source of truth, test suites, production code, evidence, and task checkboxes fully aligned.

Consult `.fireskills/PACKAGES.md`, `docs/packages/README.md`, and package cards before adding or replacing any dependency. If the task introduces a GitHub URL or modifies `package.json`/`bun.lock`, reuse existing packages whenever they satisfy requirements, declaring in each workspace package's `package.json` everything imported by its code.

## Mandatory Database Protection

Before running any test suite, regression run, or migration command, execute:

```bash
node fireskills/skills/fireskill-setup/scripts/check_database_safety.mjs \
  --project <root> --command "<target-command>"
```

For tests accessing Postgres, require a dedicated test database explicitly separate from staging secrets (`DATABASE_*`); existing Vitest test suites do not connect to the database. While the safety state is `PENDING`, do not execute any tests. Fix the environment, rerun verification, and proceed only after `SAFE`.

Discard all commands classified as `IGNORED`. Never run, convert into tasks, or seek authorization to execute `migrate:fresh`, `migrate:refresh`, `migrate:reset`, `migrate:rollback`, `db:wipe`, `schema:drop`, `prisma migrate reset`, `drizzle-kit push --force`, `drizzle-kit drop`, `DROP DATABASE`, `DROP SCHEMA`, `DROP TABLE`, `TRUNCATE`, or equivalents. The same strict prohibition applies to indirect scripts and tests relying on `RefreshDatabase` or `DatabaseMigrations`. Use transactional isolation and minimal fixtures without clearing the database. The owner's database change policy (`.fireskills/RULES.md`) is the only sanctioned reset, carried out by the responsible person, never by an agent.

## Mandatory Visual Review

Every task touching UI surfaces executes visual review, even without user request. The `VISUAL` checklist item follows `VERIFY` and must be complete before `EVIDENCE`.

For any modification with interface, consult `.fireskills/DESIGNSYSTEM.MD`, `.fireskills/INTERFACE.md`, and affected components. Inspect the rendered DOM across relevant viewports and states. Verify borders, spacing, margins, padding, and typography, alongside alignment, width, overflow, focus rings, zoom, and text wrapping. Record method, viewport, states, adjustments, and outcome in the task.

When a task introduces no UI changes, complete `VISUAL` with `Not applicable` and concrete rationale. Never skip this item simply because the user did not explicitly ask for a visual review.

## Orchestrating the Conversation

When concluding this stage or detecting work belonging to another stage, announce
`Pending blocker detected: <description> — action: resolving in this stage` and resolve it
if it falls within scope. When responsibility transfers, announce
`Automatic transition: $fireskill-07-implement → $<target> — reason: <reason> — expected result: <result>`
and immediately load the destination skill, without asking for confirmation or repeating the command. Continue in the same conversation.

After a necessary fix in this stage, announce
`Automatic resumption: $<target> → $fireskill-07-implement — resolved blocker: <result>`
and resume immediately. Re-evaluate state after each handoff to prevent cycles. Handoffs do not require confirmation; sensitive actions still require explicit authorization.

## Initial Gate

1. Resolve the root via path confirmed by `$fireskill-setup`. If the user provided a subdirectory, treat it as project root and do not promote it to a Git root. Read `<root>/specs/planned/<NNNN>-<slug>/spec.md`, evidence indexed in `research/`, repository instructions, and relevant code. Never look for `tasks.md`, `plan.md`, `research.md`, or `data-model.md`.
2. Require `Format: Specsfy/2.0`, `Status: Planned` or `Implementing`, `Definition Gate: Passed`, and `Plan Gate: Passed`.
3. If `Human Interface` is `Yes`, read section 10 and confirm the plan includes tasks for local stack, screens, menus and primary navigation, forms, actions, Vue SFC components, @nuxt/ui components (`UModal`, `UForm`, `UTable`, `UCard`, `UButton`, etc.), states, and interaction tests. Compare current stack, screens, and flows before modifying code. Preserve existing components, routes, content, permissions, and behaviors outside the documented scope. If any are missing or proposed technology diverges without confirmation, automatically return to `$fireskill-05-tasks`; do not implement a CRUD purely as an API or persistence layer.
   Prior to coding, confirm selected items in section 10 table and `.fireskills/INTERFACE.md`; after coding, update `.fireskills/INTERFACE.md` with all created, modified, or reused blocks.
   In every Vue component, load `$fireskill-specialist-nuxt-ui` before writing `.vue` files with `U*` components. If the skill is not installed, return to `$fireskill-setup` to load it before implementing the screen.
   For CRUD, confirm a single reusable `PageHeader` across all screens, full-width `UTable` with `enterpriseTableUi`, always-visible `ID` column, row-level detail navigation link, and independent edit/delete buttons on the row.
4. Run validators against `specs/<state>/<NNNN>-<slug>/spec.md`. If a gate fails due to missing task, TDD predecessor, or RED status in a previously approved plan, announce the blocker and automatically return to `$fireskill-05-tasks`; do not modify production code. That skill reopens Act II, calls TDD/BDD, and resumes implementation after validating the updated plan. For other failures, automatically load the responsible gate skill.
5. Verify test command with `check_database_safety.mjs`. Execute only after `SAFE`; without a separate test database, run no tests. Record pre-existing test failures and do not attribute them to new changes.
6. Before the first production code modification, set `Status: Implementing`, `Delivery Gate: In Progress`, and run `bun run fireskill transition <id> in-progress`.
7. Select ready work with:

```bash
node fireskills/skills/fireskill-07-implement/scripts/next_task.mjs \
  <root>/specs/<state>/<NNNN>-<slug>/spec.md
```

If no task is ready, distinguish between `complete` and `blocked by dependency`.

## Executing a Task

1. Confirm ID, type, references, dependencies, files, and verifiable outcome; check `PREP` immediately upon confirmation.
2. For `[TEST]`, follow `$fireskill-06-tdd-bdd`: read reference Gherkin in the spec and use it to design TDD tests; add markers and observe valid RED. Never create or execute raw `.feature` files. Use **Vitest** as test runner (configured in Nuxfire: `vitest ^5.0.0`).
3. For `[CODE]`, confirm completed TDD predecessor covering the same IDs, with RED documented in section 11. Without this, stop and do not touch production code. Announce blocker and automatically return to `$fireskill-05-tasks`, which reopens the plan, calls `$fireskill-06-tdd-bdd`, and resumes this skill after the new `Plan Gate: Passed`.
4. Write minimal production code making the TDD test green.
   For interface tasks, implement the screen, menus, forms, and interactions defined in the spec with documented states; do not substitute the flow with a bare API route, empty component, or shortcut skipping the agreed screen.
   In Vue/Nuxt, follow `$fireskill-specialist-nuxt-ui` to locate, reuse, adapt, and register `@nuxt/ui` components before creating new compositions.
   When a task includes `[MIGRATION]`, first create the versioned file in the planned path. Validate the command through `check_database_safety.mjs`, apply the migration to the test database, and query migration status immediately after. Record both exit-0 commands in the task's `specsfy:evidence` comment.
5. After modifying production and before checking `EXECUTE`, monitor context:

```bash
node fireskills/skills/fireskill-setup/scripts/monitor_context.mjs \
  --project <root> --check
```

   For pending stack changes, hand off to `$fireskill-aux-stack`; for persistence changes, to `$fireskill-aux-database`; for confirmed rules, to `$fireskill-aux-rules`. Review `.fireskills/PROJECT.md` on every application change. If there is no material impact on purpose, capabilities, or constraints, record justification in task evidence and repeat with `--acknowledge-project-no-change`. Do not check off the task while monitor reports `PENDING`.
6. After each `[CODE]` task, announce:
   `Automatic transition: $fireskill-07-implement → $fireskill-documentator — reason: implementation altered system — expected result: docs/ reconstructed and current`
   and load `$fireskill-documentator`. Rebuild documentation from full codebase, run `--check`, and resume this skill only when documentation is current.
7. For `[DOC]` or `[OPS]`, produce requested specific evidence.
8. Check `EXECUTE` only when the deliverable and required documentation exist in declared paths.
9. Re-verify each test command with `check_database_safety.mjs`. Run focal TDD test, related test suites, and static typechecks only after `SAFE`; check `VERIFY` only upon matching expected outcome.
10. Refactor only with all tests passing green.
11. Record command, result, and IDs in sections 11–13, then check `EVIDENCE`.
    When `Evidence Contract: 1` applies, write the `specsfy:evidence` JSON comment inside the task block and run:

```bash
node fireskills/skills/fireskill-07-implement/scripts/verify_evidence.mjs \
  specs/<state>/<NNNN>-<slug>/spec.md . --task TNNN
```

When a full run generates a schema 2 attestation, verify again with `--attestation PATH`. Require matching commit, binding for the same spec/task, identical refs and commands, passing checks, and current SHA-256 for each file. Attestations from `--self-test` do not prove delivery.
12. Conduct a micro-retrospective: apply a safe identified improvement or document "no improvement needed" with rationale; then check `IMPROVE`.
13. In section 14 of `specs/<state>/<NNNN>-<slug>/spec.md`, change parent from `- [ ]` to `- [x]` only when all six items are complete, including `VISUAL`.
14. Run `validate_tasks.mjs`, recalculate next task, and inspect next item returned by `next_task.mjs`.

A `[MIGRATION]` task cannot be completed merely because the model, query, or test exists. `verify_evidence.mjs` requires the migration file, the command applying it, and the query confirming its status. If any are missing, keep `EXECUTE`, `VERIFY`, and the parent task open.

Update checklist items incrementally as work progresses; never check items in bulk upon completion. `[P]` tasks may be grouped only when they touch disjoint files and state. If execution uncovers hidden dependencies, document them explicitly in section 14.

## Controlling Scope Creep

Stop immediately when implementation demands undescribed behavior, contradicts an `AC`, or alters public interfaces, data schemas, security invariants, or out-of-scope boundaries. Announce the blocker and automatically load `$fireskill-update-spec`. That skill captures user intent, decides if user clarification is required, updates normative specifications, reopens only affected gates, and traverses validation, tasks, and TDD/BDD. Resume this skill only after gates are approved again. Update in exact order:

```text
specs/<state>/<NNNN>-<slug>/spec.md (sections 1–13) → tasks (section 14) → tests → code → evidence in same spec
```

Reversible internal refactorings may be decided in code and recorded in reports without reopening the specification.

## Completion Gate

When all tasks in section 14 are marked complete:

1. Run full test suite, linter, typecheck, and build;
2. Verify test traceability;
3. Compare each `AC`, `FR`, `NFR`, and Definition of Done item against current evidence;
4. Scan for open tasks, placeholders, skipped tests, or known defects;
5. Rerun `monitor_context.mjs --project <root> --check` and resolve all pending documentation flags;
6. Load `$fireskill-documentator`, rebuild `docs/`, and require `build_documentation.mjs --project <root> --check` to pass;
7. Never declare completion if any evidence is missing;
8. For every `[MIGRATION]` task, run `verify_evidence.mjs` and confirm migration file, application, and status check;
9. Update `Delivery Gate` to `Passed` only with complete traceability, set `Status: Reviewing`, and run `bun run fireskill transition <id> review`.
   `$fireskill-04-validate` completes acceptance and transitions the spec to `completed`.

After final gate, project the delivery summary without writing files:

```bash
node fireskills/skills/fireskill-07-implement/scripts/render_delivery.mjs \
  specs/<state>/<NNNN>-<slug>/spec.md --format markdown
```

Use `--preview` while delivery is open. Publishing text into PRs, commits, or external tools requires explicit user authorization; the script outputs exclusively to stdout.

Read `references/completion-gates.md` for closeout criteria.

## Reporting

Report completed tasks, modified files, commands and outcomes, ID coverage, pre-existing failures, next ready task, or final gate status. Upon closeout, announce and automatically load `$fireskill-progress` to inspect global state. On failure, announce the blocker, automatically load the responsible skill when necessary, and leave the task open until fixed.

## Specialists on Demand

Read [references/specialists.md](references/specialists.md) before executing tasks whose technology or risk is not fully covered by local context. Install specialists only with explicit authorization in the consumer project.
