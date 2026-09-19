### 14. Tasks

Format:
`- [ ] TNNN [P?] [TYPE] [US-NNN?] Action with file path — Refs: IDs — Depends: IDs|none`

Use `[CODE] [MIGRATION]` for all persistent database schema changes. The task points to a versioned migration file, applies it to test database, and validates status before task completion.

Mandatory checklist per task in exact order:

```markdown
  - [ ] **PREP**: Confirm scope, IDs, dependencies, and baseline.
  - [ ] **EXECUTE**: Produce implementation at declared file path.
  - [ ] **VERIFY**: Execute targeted test verification.
  - [ ] **VISUAL**: Check borders, margins, padding, spacing, and typography; if non-visual, mark `Not applicable` with rationale.
  - [ ] **EVIDENCE**: Record command output and resolved IDs in sections 11–13.
  - [ ] **IMPROVE**: Record process improvement or justify absence.
```

#### Phase 1 — RED TDD Informed by BDD

- [ ] T001 [TEST] [TDD] [US-001] Derive from AC-001 a failing Vitest test case in layers/feature/shared/utils/feature.test.ts — Refs: US-001, FR-001, NFR-001, AC-001 — Depends: none
  - [ ] **PREP**: Read spec Gherkin and confirm rule, IDs, and test level.
  - [ ] **EXECUTE**: Author TDD case with unique `SPECSFY:` comment marker without creating `.feature` files.
  - [ ] **VERIFY**: Observe valid RED failure.
  - [ ] **VISUAL**: Inspect affected UI or mark `Not applicable` for test implementation.
  - [ ] **EVIDENCE**: Record test execution command and failure trace.
  - [ ] **IMPROVE**: Review coverage and record lesson learned.

- [ ] T002 [TEST] [TDD] [US-001] Derive from AC-002 a failing Vitest test case in layers/feature/shared/utils/feature.test.ts — Refs: US-001, FR-001, NFR-001, AC-002 — Depends: none
  - [ ] **PREP**: Read spec Gherkin and confirm rule, IDs, and test level.
  - [ ] **EXECUTE**: Author TDD case with unique `SPECSFY:` comment marker without creating `.feature` files.
  - [ ] **VERIFY**: Observe valid RED failure.
  - [ ] **VISUAL**: Inspect affected UI or mark `Not applicable` for test implementation.
  - [ ] **EVIDENCE**: Record test execution command and failure trace.
  - [ ] **IMPROVE**: Review coverage and record lesson learned.

- [ ] T003 [TEST] [TDD] [US-001] Derive from AC-003 a failing Vitest test case in layers/feature/shared/utils/feature.test.ts — Refs: US-001, FR-001, NFR-001, AC-003 — Depends: none
  - [ ] **PREP**: Read spec Gherkin and confirm rule, IDs, and test level.
  - [ ] **EXECUTE**: Author TDD case with unique `SPECSFY:` comment marker without creating `.feature` files.
  - [ ] **VERIFY**: Observe valid RED failure.
  - [ ] **VISUAL**: Inspect affected UI or mark `Not applicable` for test implementation.
  - [ ] **EVIDENCE**: Record test execution command and failure trace.
  - [ ] **IMPROVE**: Review coverage and record lesson learned.

#### Phase 2 — US-001 [title] (P1)

**Goal**: [delivered user capability].
**Independent Test**: [test command and verified result].

- [ ] T004 [CODE] [MIGRATION] [US-001] Create persistent schema in apps/functions/src/database/migrations/NNNN_feature.sql — Refs: US-001, FR-001, NFR-001, AC-001, AC-002, AC-003 — Depends: T001, T002, T003
  - [ ] **PREP**: Confirm RED TDD, test database isolation, and versioned migration path.
  - [ ] **EXECUTE**: Declare table in layer schema and generate migration with `drizzle-kit generate`.
  - [ ] **VERIFY**: Execute `bunx drizzle-kit generate` and verify SQL contains only planned changes.
  - [ ] **VISUAL**: Mark `Not applicable` because task modifies only persistent database structure.
  - [ ] **EVIDENCE**: Record generated migration file, SQL review, and test results.
  - [ ] **IMPROVE**: Review backward compatibility and document process improvement.
  <!-- specsfy:evidence {"task":"T004","refs":["US-001","FR-001","NFR-001","AC-001","AC-002","AC-003"],"files":["apps/functions/src/database/migrations/NNNN_feature.sql"],"commands":[{"run":"bunx drizzle-kit generate","exit":0}]} -->
