# Integrated Specification: {{SPEC_NAME}}

| Field | Value |
| --- | --- |
| Format | Specsfy/2.0 |
| ID | {{SPEC_ID}} |
| Slug | {{SPEC_NUMBER}}-{{SPEC_SLUG}} |
| Status | Draft |
| Effort | 1 |
| Effort updated at | {{CURRENT_DATE}} |
| Effort rationale | Initial estimate; review during discovery. |
| ClickUp Task | |
| Milestones | |
| Definition Gate | Pending |
| Plan Gate | Pending |
| Delivery Gate | Pending |
| Evidence Contract | 1 |
| Human Interface | To be defined |
| Updated at | {{CURRENT_DATE}} |

## Act I — Define

### 1. Problem and Desired Outcome

#### Problem

[Observable pain point and context.]

#### Desired Outcome

[Observable improvement perceived by user or business.]

#### Success Metrics

- [Measurable metric with quantitative target.]

### 2. Research and Clarifications

#### Executed Research

- **R-001**: [investigated question] → [conclusion and architectural impact].
- For material claims: `**R-001** [critical] claim — Verdict: verified|refuted|unverifiable — Confidence: high|medium|low — Evidence: research/path#locator — Budget: used/limit`. IDs are unique, `used <= limit`, and anchors must exist.

#### Consulted Sources and Context

- [Codebase file, documentation, stakeholder, or "No external sources".]

#### Consulted Documentation

- [Service title, version/date, URL or local path, relevant sections.]

#### Stored Research Artifacts

- `specs/draft/{{SPEC_NUMBER}}-{{SPEC_SLUG}}/research/[source]/`: [origin, version/date, license when applicable, purpose], or "No external artifacts".
- Every consulted external source must preserve local evidence in `research/`; record relative path here and keep normative conclusions in `spec.md`.

#### Resolved Questions

- **Q**: [material question] → **A**: [incorporated answer].

#### Open Questions

- [Blocking question or "None".]

### 3. Scope and Actors

#### In Scope

- [Included capability.]

#### Out of Scope

- [Explicit system boundary.]

#### Actors

- **[Actor]**: [goal, permissions, or system role].

### 4. Principles and Constraints

- **PR-001**: [governance, quality, or architectural constraint].

### 5. User Stories

#### US-001 — [title] (P1)

As a [actor], I want [capability], so that [value delivered].

**Why P1**: [value and urgency rationale].
**Independent Test**: [command and observable demonstration].
**Requirements**: FR-001

### 6. BDD Acceptance Scenarios

#### AC-001 — [happy path behavior]

**Covers**: US-001, FR-001, NFR-001

```gherkin
@US-001 @FR-001 @NFR-001 @AC-001
Feature: [observable capability]

  Scenario: [accepted happy path]
    Given [initial state]
    When [action]
    Then [observable outcome]
```

#### AC-002 — [critical variation or business rule]

**Covers**: US-001, FR-001, NFR-001

```gherkin
@US-001 @FR-001 @NFR-001 @AC-002
Feature: [observable capability]

  Scenario: [critical rule variation]
    Given [alternative context]
    When [action]
    Then [observable rule enforcement]
```

#### AC-003 — [edge case or boundary condition]

**Covers**: US-001, FR-001, NFR-001

```gherkin
@US-001 @FR-001 @NFR-001 @AC-003
Feature: [observable capability]

  Scenario: [material edge case or boundary]
    Given [failure condition or boundary state]
    When [action]
    Then [observable error recovery]
```

### 7. Requirements

#### Functional

- **FR-001**: The system shall [verifiable behavior].

#### Non-Functional

- **NFR-001**: [measurable quality attribute]. **Verification**: [automated test, inspection, or metric].

#### Errors and Edge Cases

- [Condition] → [observable system behavior].

## Act II — Design and Prove

### 8. Technical Plan

#### Existing Context

- [Stack, architecture, and conventions identified in repository.]

#### Architecture and Modules

- [Components, responsibilities, persistence layer, extension points.]

#### Migrations

- [Schema changes, migration order, rollback strategy, or "Not applicable".]

#### Models

- [Model name, responsibility, domain invariants, source file.]

#### Procedures and Handlers

- [tRPC procedure, controller, use case, input validation, output, auth, source file.]

#### Views and UI Experience

- [Screen/component, states loading/empty/error/success, accessibility, source file.]

#### Queries and Repositories

- [Query builder, filters, pagination, indexes, consistency, source file.]

#### Jobs and Async Processing

- [Queue consumer, retry schedule, idempotency key, DLQ strategy, or "Not applicable".]

#### File Structure

```text
specs/draft/{{SPEC_NUMBER}}-{{SPEC_SLUG}}/
  spec.md
  research/
apps/
layers/
```

### 9. Data Model

#### Entities

| Entity | Identity | Attributes and Validation | Relationships |
| --- | --- | --- | --- |
| [Entity] | [Primary key] | [Fields and schema rules] | [Cardinality] |

#### States and Transitions

| Entity | Current State | Event | Next State | Invariants |
| --- | --- | --- | --- | --- |
| [Entity] | [State] | [Trigger] | [Next state] | [Rule] |

#### Migration and Retention

- [Database migration and retention policy or "Not applicable".]

### 10. Interfaces and Contracts

#### Human Interface

- **Human interface present**: [Yes or No with rationale.]

#### Interface Stack and Conventions

- [Framework, routing, components, styling, forms, testing, affected screens. Explain "To be confirmed" when stack does not declare layer.]

#### Screens and Responsibilities

- [Screen name, actor, primary goal, inputs and outputs, or "Not applicable".]

#### Navigation and Information Flow

- [How users discover, query, mutate, confirm, and recover context. Record breadcrumb trail for each screen (Team > Module > Screen).]

#### Menus and Primary Navigation

- [Primary navigation, sidebar items, destinations, permissions, and responsive behaviors. If no menu, declare how views are reached.]

#### Forms and Actions

- [Form fields, input groupings, required attributes, validation messages, and visual container: page, slide-over panel, modal, or inline row.]

#### Layout Composition and Density

- [Visual hierarchy, responsive layout, shell layout, and component reuse.]

#### Vue and @nuxt/ui Component Selection

| Screen | Vue Component | Responsibility | Target File | Component Composition | Origin | Reuse or Extend |
| --- | --- | --- | --- | --- | --- | --- |
| [Screen] | [UI Block] | [Encapsulated purpose] | [File path] | [Component name] | [@nuxt/ui or custom] | [Existing or new with rationale] |

- [Select @nuxt/ui primitives (`UTable`, `UForm`, `UModal`, etc.) for this feature. Register custom components.]
- [Keep inventory aligned with `.fireskills/INTERFACE.md`.]

#### States and Accessibility

- [Explicit handling for loading, empty, error, success, forbidden, keyboard navigation, and focus rings.]

#### CRUD Contract

- [Use uniform `PageHeader` component for list, detail, create, and edit views.]
- [Listings use full-width `UTable` (`enterpriseTableUi`), keep `ID` column visible, make rows interactive links, and offer independent edit/delete actions.]
- [Register reusable components in `.fireskills/INTERFACE.md`.]

#### Visual Review During Development

- [Perform visual review during implementation checking borders, margins, padding, spacing, and typography across viewports.]
- [Record review method and adjustments under task `VISUAL` checklist item.]

#### Exposed APIs

- [tRPC procedure, HTTP method/path, auth level, request payload, response schema, error codes.]

#### External APIs

- [Service, endpoint, version, auth credentials, timeout, retry strategy, fallback, or "None".]

### 11. TDD Strategy

- **Unit**: [pure functions, composables, validations, utilities].
- **Integration/Contract**: [procedure boundary, service bindings, database access].
- **BDD/Acceptance**: [Reference Gherkin guiding test implementation].
- **Test Runner**: [Vitest via `bun run test`].
- **E2E**: [Critical user journeys or "Not applicable".]

#### RED-GREEN-REFACTOR Evidence

| IDs | Reference BDD | TDD Test Case | Observed RED | Observed GREEN | Refactor/Regression |
| --- | --- | --- | --- | --- | --- |
| US-001, FR-001, NFR-001, AC-001 | [AC-001 in section 6] | [case 1 with `SPECSFY:` comment marker] | Pending | Pending | Pending |
| US-001, FR-001, NFR-001, AC-002 | [AC-002 in section 6] | [case 2 with `SPECSFY:` comment marker] | Pending | Pending | Pending |
| US-001, FR-001, NFR-001, AC-003 | [AC-003 in section 6] | [case 3 with `SPECSFY:` comment marker] | Pending | Pending | Pending |

### 12. Test Plan and Traceability

| Requirement | BDD Scenario | Level | Test File/Command | Evidence |
| --- | --- | --- | --- | --- |
| FR-001 | AC-001 | Unit | [test file path] | Pending |
| FR-001 | AC-002 | [level] | [test file path] | Pending |
| FR-001 | AC-003 | [level] | [test file path] | Pending |
| NFR-001 | AC-001 | [level] | [verification command] | Pending |
| NFR-001 | AC-002 | [level] | [verification command] | Pending |
| NFR-001 | AC-003 | [level] | [verification command] | Pending |

### 13. Validations

#### Act I Gate — Definition

- **Result**: Pending
- **Command**: `node fireskills/skills/fireskill-04-validate/scripts/validate_spec.mjs specs/draft/{{SPEC_NUMBER}}-{{SPEC_SLUG}}/spec.md`
- **Findings**: [Pending.]

#### Act II Gate — Plan

- **Result**: Pending
- **Command**: `node fireskills/skills/fireskill-05-tasks/scripts/validate_tasks.mjs specs/draft/{{SPEC_NUMBER}}-{{SPEC_SLUG}}/spec.md`
- **Findings**: [Pending.]

#### Act III Gate — Delivery

- **Result**: Pending
- **Command**: `node fireskills/skills/fireskill-06-tdd-bdd/scripts/check_traceability.mjs specs/draft/{{SPEC_NUMBER}}-{{SPEC_SLUG}}/spec.md .`
- **Findings**: [Pending.]

### 14. Tasks

Format:
`- [ ] TNNN [P?] [TYPE] [US-NNN?] Action with file path — Refs: IDs — Depends: IDs|none`

Every task maintains this exact checklist during execution:

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

- [ ] T004 [CODE] [US-001] Implement behavior in layers/feature/server/trpc/router.ts — Refs: US-001, FR-001, NFR-001, AC-001, AC-002, AC-003 — Depends: T001, T002, T003
  - [ ] **PREP**: Confirm failing RED TDD tests and declared dependencies.
  - [ ] **EXECUTE**: Implement minimal passing code.
  - [ ] **VERIFY**: Execute targeted test suite and regression tests.
  - [ ] **VISUAL**: Inspect borders, margins, padding, spacing, and typography; mark `Not applicable` with rationale if non-visual.
  - [ ] **EVIDENCE**: Record passing GREEN test output and modified files.
  - [ ] **IMPROVE**: Document refactoring or justify absence.
  <!-- specsfy:evidence {"task":"T004","refs":["US-001","FR-001","NFR-001","AC-001","AC-002","AC-003"],"files":["layers/feature/server/trpc/router.ts"],"commands":[{"run":"targeted test command","exit":0}]} -->

**Checkpoint**: [how to demonstrate capability in isolation].

#### Interface Phase

- [ ] T005 [CODE] [US-001] Implement UI view in layers/feature/app/components/FeatureList.vue — Refs: US-001, FR-001, NFR-001, AC-001, AC-002, AC-003 — Depends: T001, T002, T003
  - [ ] **PREP**: Confirm stack conventions, routing, forms, and states from section 10; load `$fireskill-specialist-nuxt-ui` before editing `.vue` files.
  - [ ] **EXECUTE**: Implement Vue SFC with `@nuxt/ui` components; register components in `.fireskills/INTERFACE.md`.
  - [ ] **VERIFY**: Test Breadcrumb, keyboard navigation, input validation, and notifications.
  - [ ] **VISUAL**: Inspect reusable PageHeader, full-width `UTable` (`enterpriseTableUi`), ID column, row action buttons, borders, padding, and typography across screen viewports.
  - [ ] **EVIDENCE**: Record modified files and component interaction tests.
  - [ ] **IMPROVE**: Apply UI improvements or justify absence.
  <!-- specsfy:evidence {"task":"T005","refs":["US-001","FR-001","NFR-001","AC-001","AC-002","AC-003"],"files":["layers/feature/app/components/FeatureList.vue"],"commands":[{"run":"targeted test command","exit":0}]} -->

#### Final Quality Phase

- [ ] T006 [TEST] Execute full test regression and traceability in layers/feature/shared/utils/feature.test.ts — Refs: US-001, FR-001, NFR-001, AC-001, AC-002, AC-003 — Depends: T004, T005
  - [ ] **PREP**: Identify relevant test suites and validation gates.
  - [ ] **EXECUTE**: Run complete automated test regression.
  - [ ] **VERIFY**: Confirm zero test failures or traceability gaps.
  - [ ] **VISUAL**: Review final UI state or mark `Not applicable` with rationale.
  - [ ] **EVIDENCE**: Record final test counts and commands.
  - [ ] **IMPROVE**: Document workflow retrospective notes.

### 15. Execution Order

- Critical Path: T001/T002/T003 → T004 → T005 → T006.
- Parallel Tasks: [IDs and rationale or "None".]
- MVP Strategy: [minimal slice delivering end-to-end customer value].

## Act III — Deliver and Validate

### 16. Dependencies, Risks, and Assumptions

#### Dependencies

- [Upstream dependency or "None".]

#### Risks

- [Risk description] → [Mitigation strategy].

#### Assumptions

- [Assumed default or operational baseline.]

### 17. Decisions

- **DEC-001**: [decision title] — [rationale, considered alternatives, and trade-offs].

### 18. Definition of Done

- [ ] `Definition Gate` is `Passed`.
- [ ] `Plan Gate` is `Passed`.
- [ ] `Delivery Gate` is `Passed`.
- [ ] All applicable `AC` acceptance scenarios pass.
- [ ] All requirements have verified test evidence.
- [ ] All tasks in section 14 are completed.
- [ ] All static checks and automated test suites pass.
