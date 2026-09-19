---
name: fireskill-05-tasks
description: "Use when the user wants to break down or decompose the specification into tasks, populate or update section `14. Tasks` of `spec.md`, order dependencies, plan vertical slices, or prepare execution. Also use when an automatic transition requests planning, replanning, or resumption after RED. Use solely to edit tasks within the single normative spec; do not create tasks.md, write implementation code, or mark work complete."
---

# Break Down the Specification into Tasks

## Mandatory Preparation

Before executing this skill, you must load `$fireskill-setup` at the project root.
On automatic handoff, reload it before this step.
Reuse the root confirmed in conversation and do not proceed if setup reports a pending blocker.

## Interaction Mode

Interaction mode: `questions`.
Before formulating any question, read and apply the `Numbered Questions Protocol` from `fireskills/skills/Spec.md`.

## Database Protection in Planning

Execute
`fireskills/skills/fireskill-setup/scripts/check_database_safety.mjs --project <root>`
before planning or approving any `[TEST]` task accessing Postgres. The plan must maintain a dedicated test database explicitly distinct from secrets configured for staging (`DATABASE_*`); existing Vitest test suites do not connect to the database.

While the result is `PENDING`, no test task is marked ready and this skill does not invoke runners. When the result is `IGNORED`, discard destructive commands. Never include `migrate:fresh`, `migrate:refresh`, `migrate:reset`, `migrate:rollback`, `db:wipe`, `schema:drop`, `prisma migrate reset`, `DROP DATABASE`, `DROP SCHEMA`, `DROP TABLE`, `TRUNCATE`, `RefreshDatabase`, `DatabaseMigrations`, or equivalents in any task, test suite, test harness, regression suite, or Definition of Done.

Populate section `14. Tasks` in `specs/<state>/<NNNN>-<slug>/spec.md`. The spec remains the single source of truth; each task must be small, verifiable, ordered, and linked to IDs defined within it.

## Orchestrating the Conversation

When concluding this stage or detecting work belonging to another stage, announce
`Pending blocker detected: <description> — action: resolving in this stage` and resolve it
if it falls within scope. When responsibility transfers, announce
`Automatic transition: $fireskill-05-tasks → $<target> — reason: <reason> — expected result: <result>`
and immediately load the destination skill, without asking for confirmation or repeating the command. Continue in the same conversation.

After a necessary fix in this stage, announce
`Automatic resumption: $<target> → $fireskill-05-tasks — resolved blocker: <result>`
and resume immediately. Re-evaluate state after each handoff to prevent cycles. Handoffs do not require confirmation; sensitive actions still require explicit authorization.

## Preconditions

1. Read the indicated spec in `specs/defined/<NNNN>-<slug>/spec.md` and require `Format: Specsfy/2.0`, `Definition Gate: Passed`, and `Status` `Defined`, `Planned`, or `Implementing`. Accept the latter two only for automatic replanning of a blocker detected in subsequent steps.
2. Run spec validation when the gate is not yet verified.
3. Inspect repository to identify actual stack, commands, and paths. In Nuxfire, the test runner is Vitest (`bun run test`); verify real paths in `layers/*/` and `apps/*/` before generating paths or commands.
4. Run the context monitor before planning:

```bash
node fireskills/skills/fireskill-setup/scripts/monitor_context.mjs \
  --project .
```

   Use stack, application, rules, and persistence signals to plan documentation updates alongside implementation, without assuming new requirements.
5. If decisions affecting architecture, data schemas, or acceptance criteria are missing, announce and automatically return to `$fireskill-02-backlog`. After decisions are made, use `$fireskill-update-spec` for already approved specs or `$fireskill-03-specify` during initial drafting.

## Generating Tasks

Use `.fireskills/templates/custom/Tasks.md` as contract when present, falling back to `.fireskills/templates/Tasks.md`. Replace exclusively the contents of sections `14. Tasks` and `15. Execution Order` in `<root>/specs/<state>/<NNNN>-<slug>/spec.md`; preserve all other sections intact.

- If the spec is `Planned` or `Implementing`, announce the blocker, reopen Act II, and set `Status: Defined`, `Plan Gate: Pending`, and `Delivery Gate: Pending` before editing. Downstream gates and evidence are invalidated by plan revisions.
- On a spec already `Defined`, set `Plan Gate: Pending` and `Delivery Gate: Pending` before editing.
- Preserve existing task IDs when updating; do not renumber completed tasks.
- Organize into minimum setup, essential foundations, prioritized user stories, and wrap-up.
- Keep user stories structured as independently demonstrable vertical slices.
- When `Human Interface` is `Yes`, create explicit tasks for screens, menus and primary navigation, forms, and actions described in section 10, in addition to data/API layers. Include interface behavior tests for navigation, submission, validation, error recovery, and the chosen interaction pattern (modal vs. slideover). Use only components, conventions, and test runners native to the registered interface stack; each task specifies actual Vue components, `@nuxt/ui` components, or routes. Include a task to update `.fireskills/INTERFACE.md` with purpose, file path, API, states, consumers, and reuse rules for all created or modified components.
  In every screen task (`.vue` with `U*` components), record in `PREP` the usage of `$fireskill-specialist-nuxt-ui` before implementation. The specialist guides component discovery, reuse, and adaptation. If not installed, return to `$fireskill-setup` to load it before clearing the `[CODE]` task.
  Group these tasks under the mandatory subsection `#### Interface Phase` in section 14. Each registered screen receives at least one dedicated task; never hide UI deliverables inside generic backend tasks.
- For each `AC`, create a distinct `[TEST] [TDD]` task referencing the Gherkin scenario in the spec. The set of these tasks materializes at least three distinct TDD cases for the feature and for each `US`, `FR`, and `NFR`.
- Never create tasks for `.feature` files or step definitions, and never execute raw Gherkin directly.
- The TDD task points to a Vitest test and requires the `SPECSFY` marker, executed using the project Vitest setup (`bun run test`; for single file, `bunx vitest run <file>`).
- Make each `[CODE]` task depend on its TDD predecessor in the same slice with RED status recorded.
- Whenever a task creates or alters a schema, table, column, index, relation, or persistent model, create a separate `[CODE] [MIGRATION]` task. It points to a versioned file inside the project migrations directory, depends on TDD tests, and precedes code utilizing the new schema.
- The `VERIFY` item of a `[MIGRATION]` task records two commands approved by `check_database_safety.mjs`: one applying the migration to the test database and another querying migration status. Do not approve Plan Gate without this task.
- When the slice alters package manifests or structural configurations, create a `[DOC]` task for `.fireskills/STACK.md`. When altering database schemas, tables, fields, relations, or migrations, create a mandatory `[DOC]` task for `.fireskills/DATABASE.md`.
- For application-level changes, include review of `.fireskills/PROJECT.md` in slice completion. If there is no material impact, record explicit justification in evidence.
- Every `[CODE]` task requires independent reconstruction of `docs/` via `$fireskill-documentator` before `EXECUTE`, even if documentation existed prior to the change.
- When a convention becomes a confirmed rule, create a `[DOC]` task for `.fireskills/RULES.md`.
- Assign each task a single outcome, exact file path, and verifiable criterion.
- Use the `[MIGRATION]` tag only alongside `[CODE]` or `[OPS]`. The path must reside in `apps/functions/src/database/migrations/` (generated by `drizzle-kit generate`), adhering to `$fireskill-specialist-drizzle`.
- Querying, reading, or using an existing table does not require `[MIGRATION]`. The tag is mandatory when the plan creates or mutates schema structures.
- Attach to each task, in exact sequence, the items `PREP`, `EXECUTE`, `VERIFY`, `VISUAL`, `EVIDENCE`, and `IMPROVE` defined in the resolved `Tasks.md` template.
- The `VISUAL` item is mandatory even without explicit user request. It verifies borders, spacing, margins, padding, and typography during development. For non-visual tasks, record `Not applicable` with concrete rationale.
- Write checklist items as task-specific outcomes, not boilerplate copied phrases.
- Keep parent tasks and checklist items unchecked when generating; implementation skills check off items immediately upon producing evidence.
- The `IMPROVE` item must record a concrete improvement applied or declare that none was needed with justification.
- When the spec declares `Evidence Contract: 1`, each completed `[CODE]` task must contain a `specsfy:evidence` JSON comment containing `task`, `refs`, `files`, and `commands` (`run` and `exit`). Generate the comment within the task block, never in a separate file.
- Mark `[P]` only when tasks share no files, mutable state, or execution dependencies.
- Declare dependencies strictly by ID; do not rely on visual document order.
- Cover all applicable `FR`, `NFR`, and `AC` IDs. Do not create tasks without references, except justified setup/polish.
- Do not include generic examples or placeholders.

Canonical format:

```markdown
- [ ] T001 [TEST] [TDD] [US-001] Derive Vitest test from spec BDD in layers/teams/shared/utils/abilities.test.ts — Refs: FR-002, AC-003 — Depends: none
- [ ] T002 [CODE] [US-001] Implement validation in layers/teams/server/trpc/teams.ts — Refs: FR-002, AC-003 — Depends: T001
```

Allowed tags following the ID: `[P]`, `[TEST]`, `[TDD]`, `[CODE]`, `[DOC]`, `[OPS]`, `[MIGRATION]`, and `[US-NNN]`.

## Validation

Execute:

```bash
node fireskills/skills/fireskill-05-tasks/scripts/validate_tasks.mjs specs/<state>/<NNNN>-<slug>/spec.md --allow-draft
```

When human interface applies, also execute:

```bash
node fireskills/skills/fireskill-05-tasks/scripts/validate_interface_tasks.mjs specs/<state>/<NNNN>-<slug>/spec.md
```

Correct duplicate IDs, invalid/circular dependencies, missing references, items without three BDD scenarios, ACs without distinct TDD tasks, plans lacking three TDD predecessors per feature/`US`/`FR`/`NFR`, code lacking TDD predecessor, missing/out-of-order checklist items, mismatched parent/item states, progress on blocked tasks, or vague task descriptions. Perform a maximum of three correction cycles.
Under Evidence Contract, the validator also flags missing files, invalid references, commands lacking `exit: 0`, or completed tasks without evidence.

When structure passes while `Plan Gate: Pending`, automatically invoke `$fireskill-06-tdd-bdd` in `prepare` mode. It uses spec BDD to materialize the TDD predecessor, observes RED status, and completes solely that test task. Then automatically resume this skill to:

1. Rerun validator with `--allow-draft`;
2. Update `Plan Gate` to `Passed` and set `Status: Planned`;
3. Record outcome in `Act II Gate — Plan`;
4. Rerun validator without `--allow-draft`.

After Plan Gate passes, execute `bun run fireskill transition <id> planned`. When conversation changes scope, dependencies, or required capabilities, call `$fireskill-interviewer` before replanning and update Effort with rationale.

Strict mode rejects `Plan Gate: Passed` when any TDD predecessor of a `[CODE]` task remains open. If validation fails, maintain `Status: Defined`, `Plan Gate: Failed`, `Delivery Gate: Pending`, and report blockers.

## Reporting

Report total task count, counts by type, critical path, `[P]` parallelization opportunities, ID coverage, and upon passing gate, announce and automatically load `$fireskill-07-implement`. Never create `tasks.md`.

## Specialists on Demand

Read [references/specialists.md](references/specialists.md) when decomposing domain-specific technology, database, interface, or operations work that benefits from specialized checklists.
