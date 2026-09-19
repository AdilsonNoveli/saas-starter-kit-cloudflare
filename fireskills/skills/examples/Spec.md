# Integrated Specification: Specification Progress Dashboard

| Field | Value |
| --- | --- |
| Format | Specsfy/2.0 |
| ID | SPEC-0001 |
| Slug | 0001-progress-dashboard |
| Status | Draft |
| Definition Gate | Pending |
| Plan Gate | Pending |
| Delivery Gate | Pending |
| Evidence Contract | 1 |
| Updated at | 2026-07-25 |

> Non-normative example. It demonstrates document architecture and acts as a
> readable fixture for the CLI; real projects must create their own `spec.md`.

## Act I — Define

### 1. Problem and outcome

#### Problem

It is difficult to assess the progress of multiple specifications without manually opening each file.

#### Desired outcome

Display a consolidated, live overview of checklists directly in the terminal.

#### Success metrics

- Recalculate progress within 1 second of saving a spec file.

### 2. Research and clarifications

#### Executed research

- No external research was required for this example.

#### Consulted sources and context

- Central framework contract and canonical template structure.

#### Consulted documentation

- No external documentation.

#### Stored research artifacts

- No external artifacts.

#### Answered questions

- **Q**: What is the source of truth for progress? → **A**: Checklists in `spec.md`.

#### Open questions

- None.

### 3. Scope and actors

#### In-scope

- Listing specs with total completed and pending items.

#### Out-of-scope

- Automated modification of checklists by the dashboard.

#### Actors

- **Developer**: monitors execution of a specification.

### 4. Project principles and constraints

- **PR-001**: The dashboard only projects the state of existing files.

### 5. User stories

#### US-001 — View progress (P1)

As a developer, I want to view spec progress to identify the next work slice without opening each document.

**Why P1**: Consolidated visibility is the core value proposition.
**Independent test**: Run the CLI against a fixture with checklists.
**Requirements**: FR-001

### 6. BDD acceptance scenarios

#### AC-001 — Consolidate checklists

**Covers**: US-001, FR-001, NFR-001

```gherkin
@US-001 @FR-001 @NFR-001 @AC-001
Feature: Consolidated progress

  Scenario: Spec with completed and pending items
    Given a spec with two completed and two pending checklists
    When the dashboard calculates its progress
    Then it reports fifty percent
```

#### AC-002 — Consolidate spec without checklists

**Covers**: US-001, FR-001, NFR-001

```gherkin
@US-001 @FR-001 @NFR-001 @AC-002
Feature: Consolidated progress

  Scenario: Spec without traceable items
    Given a spec without checklists
    When the dashboard calculates its progress
    Then it reports zero items without modifying the spec
```

#### AC-003 — Reject unreadable spec

**Covers**: US-001, FR-001, NFR-001

```gherkin
@US-001 @FR-001 @NFR-001 @AC-003
Feature: Consolidated progress

  Scenario: Spec file cannot be read
    Given a spec whose content cannot be read
    When the dashboard attempts to calculate progress
    Then it reports the error without modifying the file
```

### 7. Requirements

#### Functional

- **FR-001**: The CLI must calculate completed and pending checklists per spec.

#### Non-functional

- **NFR-001**: Projection must not modify the spec. **Verification**: compare
  file checksum before and after reading.

#### Errors and edge cases

- Unreadable file → report error without mutating the file.

## Act II — Design and prove

### 8. Technical plan

#### Existing context

- TypeScript CLI with Markdown parser and terminal interface.

#### Architecture and modules

- The scanner discovers specs; the parser calculates metrics; the TUI projects results.

#### Migrations

- Not applicable.

#### Models

- `SpecProgress` preserves identity and derived totals.

#### Controllers and use cases

- `scan_project` receives root directory and returns projections.

#### Views and experience

- Dashboard with totals, percentages, progress bars, and empty states.

#### Queries and repositories

- Not applicable.

#### Jobs and asynchronous processing

- A file watcher invalidates projections when Markdown files change.

#### File structure

```text
specs/draft/0001-progress-dashboard/
  spec.md
cli/src/progress.ts
cli/tests/progress.test.ts
```

### 9. Data model

#### Entities

| Entity | Identity | Attributes and rules | Relations |
| --- | --- | --- | --- |
| SpecProgress | spec path | total, completed, pending | derived from a spec |

#### States and transitions

| Entity | Current state | Event | Next state | Invariants |
| --- | --- | --- | --- | --- |
| Projection | current | file saved | recalculated | does not mutate source |

#### Migration and retention

- Not applicable.

### 10. Interfaces and contracts

#### Exposed APIs

- `scan_project(root)` returns a collection of progress objects.

#### External APIs consumed

- None.

#### Documentation of consulted APIs

- None.

#### Events and other contracts

- Changes in `mtime` invalidate in-memory projections.

### 11. TDD strategy

- **Unit**: calculation and percentage logic.
- **Integration/contract**: discovery of canonical structure.
- **BDD/acceptance**: Gherkin AC-001, AC-002, and AC-003 as reference for derived tests.
- **E2E**: dashboard initialization with fixture.
- **Manual verification**: terminal rendering legibility.

#### RED-GREEN-REFACTOR evidence

| IDs | Reference BDD | TDD test informed by BDD | Observed RED | Observed GREEN | Refactor / regression |
| --- | --- | --- | --- | --- | --- |
| US-001, FR-001, NFR-001, AC-001 | AC-001 in section 6 | percentage test case in tests/progress.test.ts with `SPECSFY:` tag | Pending | Pending | Pending |
| US-001, FR-001, NFR-001, AC-002 | AC-002 in section 6 | empty test case in tests/progress.test.ts with `SPECSFY:` tag | Pending | Pending | Pending |
| US-001, FR-001, NFR-001, AC-003 | AC-003 in section 6 | unreadable test case in tests/progress.test.ts with `SPECSFY:` tag | Pending | Pending | Pending |

### 12. Test plan and traceability

| Requirement | BDD scenario | Level | Expected file/command | Evidence |
| --- | --- | --- | --- | --- |
| FR-001 | AC-001 | Unit | `npm test -- --run tests/progress.test.ts` | Pending |
| FR-001 | AC-002 | Unit | `npm test -- --run tests/progress.test.ts` | Pending |
| FR-001 | AC-003 | Integration | `npm test -- --run tests/progress.test.ts` | Pending |
| NFR-001 | AC-001 | Integration | compare checksum before and after | Pending |
| NFR-001 | AC-002 | Integration | compare checksum before and after | Pending |
| NFR-001 | AC-003 | Integration | compare checksum before and after | Pending |

### 13. Validations

#### Act I Gate — Definition

- **Outcome**: Pending
- **Command**: `validate_spec.mjs specs/draft/0001-progress-dashboard/spec.md`
- **Findings**: Example maintained in Draft.

#### Act II Gate — Plan

- **Outcome**: Pending
- **Command**: `validate_tasks.mjs specs/draft/0001-progress-dashboard/spec.md`
- **Findings**: Execution not yet started.

#### Act III Gate — Delivery

- **Outcome**: Pending
- **Command**: `check_traceability.mjs specs/draft/0001-progress-dashboard/spec.md .`
- **Findings**: Execution not yet started.

### 14. Tasks

- [ ] T001 [TEST] [TDD] [US-001] Materialize percentage test case in tests/progress.test.ts — Refs: US-001, FR-001, NFR-001, AC-001 — Depends: none
  - [ ] **PREP**: Confirm fixture, IDs, and baseline.
  - [ ] **EXECUTE**: Write test case with designated `SPECSFY:` marker.
  - [ ] **VERIFY**: Observe valid RED state.
  - [ ] **VISUAL**: Verify borders, spacing, margins, padding, and typography; record `Not applicable` because task only materializes tests.
  - [ ] **EVIDENCE**: Record command and cause of RED.
  - [ ] **IMPROVE**: Review fixture clarity.

- [ ] T002 [TEST] [TDD] [US-001] Materialize empty test case in tests/progress.test.ts — Refs: US-001, FR-001, NFR-001, AC-002 — Depends: none
  - [ ] **PREP**: Confirm fixture, IDs, and baseline.
  - [ ] **EXECUTE**: Write test case with designated `SPECSFY:` marker.
  - [ ] **VERIFY**: Observe valid RED state.
  - [ ] **VISUAL**: Verify borders, spacing, margins, padding, and typography; record `Not applicable` because task only materializes tests.
  - [ ] **EVIDENCE**: Record command and cause of RED.
  - [ ] **IMPROVE**: Review fixture clarity.

- [ ] T003 [TEST] [TDD] [US-001] Materialize unreadable test case in tests/progress.test.ts — Refs: US-001, FR-001, NFR-001, AC-003 — Depends: none
  - [ ] **PREP**: Confirm fixture, IDs, and baseline.
  - [ ] **EXECUTE**: Write test case with designated `SPECSFY:` marker.
  - [ ] **VERIFY**: Observe valid RED state.
  - [ ] **VISUAL**: Verify borders, spacing, margins, padding, and typography; record `Not applicable` because task only materializes tests.
  - [ ] **EVIDENCE**: Record command and cause of RED.
  - [ ] **IMPROVE**: Review fixture clarity.

- [ ] T004 [CODE] [US-001] Implement calculation in cli/src/progress.ts — Refs: US-001, FR-001, NFR-001, AC-001, AC-002, AC-003 — Depends: T001, T002, T003
  - [ ] **PREP**: Confirm RED and read-only contract.
  - [ ] **EXECUTE**: Implement minimal change.
  - [ ] **VERIFY**: Execute targeted test and regression suite.
  - [ ] **VISUAL**: Verify borders, spacing, margins, padding, and typography; record `Not applicable` with rationale if no interface exists.
  - [ ] **EVIDENCE**: Record GREEN and modified files.
  - [ ] **IMPROVE**: Record improvement or justified absence.

### 15. Execution order

- Critical path: T001/T002/T003 → T004.
- Parallel tasks: None.
- MVP strategy: calculate and display percentage for a single spec.

## Act III — Deliver and validate

### 16. Dependencies, potential failures, and assumptions

#### Dependencies

- CLI internal Markdown parser.

#### Potential failures

- Summing checklists inside code blocks → ignore fenced code blocks.

#### Assumptions

- Canonical structure remains in `specs/<state>/<NNNN>-<slug>/spec.md`.

### 17. Decisions

- **DEC-001**: Keep dashboard strictly read-only — preserves spec as single source of truth.

### 18. Definition of Done

- [ ] `Definition Gate` is `Passed`.
- [ ] `Plan Gate` is `Passed`.
- [ ] `Delivery Gate` is `Passed`.
- [ ] All applicable `AC` scenarios pass.
- [ ] All requirements have verification evidence.
- [ ] All tasks in section 14 are completed.
- [ ] Available tests and static checks pass.
