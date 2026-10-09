# Completion Gates

## Per Task

- Dependencies are completed.
- Described outcome exists at the specified file path.
- Referenced IDs remain valid.
- Focal test observed RED when behavior was new.
- Spec Gherkin was used as reference to design the TDD test; no raw `.feature` file was created or executed.
- Each TDD case identified by its own `SPECSFY:` marker observed RED and then GREEN; feature as a whole and each `US`, `FR`, and `NFR` have at least three.
- Focal test and related regression suites pass green.
- Checkboxes change only after verification.
- The six items `PREP/EXECUTE/VERIFY/VISUAL/EVIDENCE/IMPROVE` are complete in that exact order and reflect concrete results. `VISUAL` records verification of borders, spacing, margins, padding, and typography when the task modifies UI surfaces, even without explicit user request.
- Parent task is marked complete only after all six items are checked.
- Every `[MIGRATION]` task has a versioned file, exit-0 application command, and exit-0 status check query.
- Micro-retrospective recorded an applied improvement or documented justification for none.

## Per Story

- Independent story test was executed.
- Story has at least three `AC`s and three distinct TDD test cases.
- All story `AC` scenarios have documented evidence.
- Relevant error and permission paths were exercised.
- Story delivers independent value without depending on lower-priority stories, unless explicitly decided.

## Final Acceptance

- `Definition Gate` and `Plan Gate` remain `Passed`; `Delivery Gate` transitions to `Passed` only after the evidence below.
- Section `14. Tasks` of `specs/<state>/<NNNN>-<slug>/spec.md` contains zero open tasks.
- Full test suite, linter, typecheck, and build pass clean.
- Traceability contains zero automatable gaps.
- NFRs have documented measurements or evidence.
- No placeholders, skipped tests, or undisclosed scope changes exist.
- Observed codebase matches the current version of the single source of truth `specs/<state>/<NNNN>-<slug>/spec.md`.
- No structural database mutation was left without a `[MIGRATION]` task, and all planned migrations were applied and verified on the test database.
