---
name: fireskill-06-tdd-bdd
description: "Use when the user requests TDD, BDD, tests derived from specification reference Gherkin, traceability between `spec.md` and tests, or a RED-GREEN-REFACTOR cycle. Also use when an automatic transition requests materialization, RED proof, or test verification. Use to edit sections 11–13 and execute tests; `fireskill-07-implement` remains responsible for production tasks in section 14 of the same file."
---

# Execute TDD Driven by Specification BDD

## Mandatory Preparation

Before executing this skill, you must load `$fireskill-setup` at the project root.
On automatic handoff, reload it before this step.
Reuse the root confirmed in conversation and do not proceed if setup reports a pending blocker.

## Interaction Mode

Interaction mode: `questions`.
Before formulating any question, read and apply the `Numbered Questions Protocol` from `fireskills/skills/Spec.md`.

Read BDD scenarios as normative reference and convert specified behavior into executable TDD tests and traceable evidence. Gherkin helps users and agents comprehend context, action, and expected outcome; it is not an executable test runner itself.

## Mandatory Database Protection

Before executing any focal test, test suite, or regression run, verify the command and environment:

```bash
node fireskills/skills/fireskill-setup/scripts/check_database_safety.mjs \
  --project <root> --command "<test-command>"
```

For tests accessing Postgres, verification requires a dedicated test database explicitly separate from staging secrets (`DATABASE_*`); existing Vitest test suites do not connect to the database. Do not execute any tests while the result is `PENDING`. Fix the test environment, rerun the safety check, and proceed only after `SAFE`.

Treat `IGNORED` as an absolute command rejection. Do not run, adapt with `--force`, or seek authorization to execute `migrate:fresh`, `migrate:refresh`, `migrate:reset`, `migrate:rollback`, `db:wipe`, `schema:drop`, `prisma migrate reset`, `drizzle-kit push --force`, `drizzle-kit drop`, `DROP DATABASE`, `DROP SCHEMA`, `DROP TABLE`, `TRUNCATE`, or equivalents. Do not use `RefreshDatabase` or `DatabaseMigrations`; for database-backed tests, prefer rolled-back transactions and fixtures creating strictly necessary records. The owner's database change policy (reset by the responsible person, never by an agent) is in `.fireskills/RULES.md`.

## Orchestrating the Conversation

When concluding this stage or detecting work belonging to another stage, announce
`Pending blocker detected: <description> — action: resolving in this stage` and resolve it
if it falls within scope. When responsibility transfers, announce
`Automatic transition: $fireskill-06-tdd-bdd → $<target> — reason: <reason> — expected result: <result>`
and immediately load the destination skill, without asking for confirmation or repeating the command. Continue in the same conversation.

After a necessary fix in this stage, announce
`Automatic resumption: $<target> → $fireskill-06-tdd-bdd — resolved blocker: <result>`
and resume immediately. Re-evaluate state after each handoff to prevent cycles. Handoffs do not require confirmation; sensitive actions still require explicit authorization.

## Choose Mode

- `prepare`: Prior to implementation, create the next test case/scenario and prove RED without writing production code.
- `cycle`: Execute RED → GREEN → REFACTOR for an explicitly selected vertical slice.
- `verify`: Execute test suites and audit traceability without introducing new behavior.

If the user specifies no mode, use `prepare` when section 14 is not yet in execution, and `cycle` when an active task exists.

## Preparation

1. Read `specs/<state>/<NNNN>-<slug>/spec.md`, test files, and repository configuration.
2. Require `Format: Specsfy/2.0` and `Definition Gate: Passed`. In `prepare` mode, require `Status: Defined` and `Plan Gate: Pending`; in `cycle` and `verify` modes, require `Status: Planned` or `Implementing`.
3. Select a small vertical slice: one Gherkin `AC` and associated `FR/NFR`s.
4. Resolve the project test runner based on stack before authoring tests:
   - Nuxfire (Node/Bun): Vitest (`bun run test`; root aggregator `vitest.config.mts` and one `vitest.config.ts` per layer);
   - Other stacks: preserve existing test runners or ask when no reproducible decision exists.
5. Verify test command and environment with `check_database_safety.mjs`. If state is not `SAFE`, do not execute tests and keep step pending.
6. In Nuxfire, Vitest is configured at root (`bun run test`, 7 files, 131 tests) and per-layer; never install testing dependencies silently.
7. Read `references/test-levels.md` to select the lowest testing level that conclusively proves behavior.

## Use BDD to Write TDD

- Use the Gherkin block of the `AC` in `spec.md` as reference contract without altering its meaning.
- Do not create, copy, or run raw `.feature` files or step definitions. Given/When/Then remain strictly in `spec.md`.
- Author TDD tests in Vitest alongside code (`shared/**/*.test.ts` or `server/**/*.test.ts` of the layer), at the lowest layer proving the requirement. Tag each executable test case immediately above its definition with:

```ts
// SPECSFY: US-001 FR-001 AC-001
```

- Materialize at least three distinct TDD cases for the feature and for each `US`, `FR`, and `NFR`: happy path, critical business variation/rule, and failure or boundary condition. A single `SPECSFY:` comment shared across a file counts as one test case, even if the file contains multiple assertions.
- Cover each `AC` with at least one TDD case, avoiding redundant test cases.
- Select unit, integration, contract, or browser tests according to the boundary described by BDD; never create separate test suites merely to label them BDD.
- Avoid mocks that stub out the exact boundary the scenario seeks to verify.

## Mandatory Cycle

### RED

1. Read the reference BDD scenario and write the minimal TDD test proving the `AC` and requirements.
2. Run the TDD test; never run raw Gherkin.
3. Confirm failure stems directly from missing or incorrect behavior.
4. If failure is due to syntax errors, fixture issues, broken imports, or environment, fix test harness and rerun.
5. If the test passes before implementation, it fails to demonstrate a behavioral gap: refine test or prove functionality already exists.

In `prepare` mode, stop after achieving valid RED, record evidence, and check off the checklist of the corresponding `[TEST]` task. Do not modify `Plan Gate`; announce and automatically return to `$fireskill-05-tasks`, which validates all predecessors before promoting spec to `Planned`.
Record the corresponding row in the `RED-GREEN-REFACTOR Evidence` table with observed RED output.

### GREEN

In `cycle` mode, write the minimal production code necessary to satisfy the scenario. Run the focal test first, followed by the related suite. Do not generalize until required by an actual concrete example.
Update the evidence row with observed GREEN output.

### REFACTOR

With tests green, eliminate duplication and improve naming/structure without altering behavior. Re-execute related suites.
Record regression command in section 11 and evidence in the section 12 matrix.

## Audit Traceability

Execute:

```bash
node fireskills/skills/fireskill-06-tdd-bdd/scripts/check_traceability.mjs specs/<state>/<NNNN>-<slug>/spec.md .
```

Treat as gaps any feature, `US`, `FR`, or `NFR` with fewer than three TDD cases, and any `AC` lacking at least one case. For manual or observability-verified NFRs, document evidence without dispensing with three automatable cases; adjust `--kinds` when justified without removing applicable IDs.
In specs with `Evidence Contract: 1`, add `--full-chain` to enforce `US/FR/NFR/AC → test → task → evidence`.
During implementation, maintain `Delivery Gate: In Progress` and update `Act III Gate — Delivery` in section 13. Set `Passed` only when no mandatory gaps remain, all tasks are complete, and the Definition of Done is verified.

## Discipline Under Pressure

| Temptation | Rule |
| --- | --- |
| "It's a tiny change." | Small changes get small tests; size never excuses skipping RED. |
| "The code is already written." | Write a characterization test; never edit production code to fabricate fake RED. For new behavior, write a test case not yet satisfied. |
| "Deadline pressure allows skipping RED." | Without an observed failure, there is zero proof the test protects the requirement. |
| "The tech lead approved skipping." | Authority may adjust scope, but cannot turn lack of evidence into TDD. |
| "Testing afterwards is equivalent." | Test-first shapes API ergonomics and proves failure detection before code exists. |

In a test task, update `PREP`, `EXECUTE`, `VERIFY`, `VISUAL`, `EVIDENCE`, and `IMPROVE` as each occurs. `VISUAL` is mandatory to confirm whether tests touch UI surfaces; if non-visual, record `Not applicable` with rationale. Do not mark the parent task complete without file, marker, valid RED, command/evidence, and process review.
Do not write production code before the TDD predecessor informed by spec BDD in the same slice is complete with RED recorded in the spec.

## Audit QA

After running project test suites, record `Passed` or failure details in the Evidence column of section 12, then audit:

```bash
node fireskills/skills/fireskill-06-tdd-bdd/scripts/verify_acceptance.mjs \
  specs/<state>/<NNNN>-<slug>/spec.md .
```

The auditor never runs arbitrary commands extracted from Markdown. Manual ACs require methodology, owner, and evidence; unverified ACs prevent `Delivery Gate: Passed`.
When test runner attestation exists, repeat with `--attestation PATH`: the auditor strictly requires the `acceptance:<slug>` check passed, valid JSON detail, and full AC coverage. Plain text `Passed` does not substitute for this proof.

## Report Evidence

Report slice, covered IDs, test file, RED command, failure reason, GREEN command when applicable, regression suite, and traceability gaps.

## Specialists on Demand

Read [references/specialists.md](references/specialists.md) when test runner, boundary, or testing oracle requires technology-specific domain knowledge. Specialists complement this skill; this skill enforces RED/GREEN rigor and traceability.
