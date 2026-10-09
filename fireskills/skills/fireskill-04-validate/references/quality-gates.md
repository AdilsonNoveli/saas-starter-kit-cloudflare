# Quality Gates

## Content

- The file declares `Format: Specsfy/2.0` and strictly preserves the three acts in canonical order.
- Problem, persona, and expected outcome are explicit.
- In-scope and out-of-scope sections do not contradict each other.
- Success metrics define numeric/observable targets and measurement methods.
- Canonical domain terms are used consistently.
- Research distinguishes verified facts, clarifications, assumptions, and decisions.
- Research records sources, consulted documentation, resolved questions, and open questions.
- Every external API or documentation consulted has local evidence in `research/`, with origin, version/date, license where applicable, and indexed path in `spec.md`.

## Requirements

- Each requirement describes an obligation, not an ambiguous solution.
- Subjective words like fast, secure, simple, scalable, and intuitive have explicit measures or objective criteria.
- Permissions, validation, error handling, concurrency, limits, and empty states are documented where relevant.
- Non-functional requirements have targets and verification methods.

## Behavior

- Each P1 journey includes both happy path and critical failure variations.
- Each BDD scenario contains observable Given, When, and Then clauses.
- Each `AC` references existing `US/FR/NFR` identifiers.
- The entire feature and each `US`, `FR`, and `NFR` have at least three distinct `AC` scenarios declared in `**Covers**`.

## Implementability

- Technical architecture respects the existing repository structure.
- Implementation plan, data model, state machines, contracts, and migrations are decided concretely enough to specify file paths in tasks.
- Migrations, models, controllers/use cases, views, queries/repositories, and background jobs define explicit responsibilities, paths, and justified "Not applicable" when omitted.
- Exposed and consumed APIs document version, authentication, inputs, outputs, errors, and consulted references.
- External dependencies include failure modes, timeouts, and degradation strategies.
- Risks and assumptions do not conceal unresolved high-impact decisions.

## Verification

- The testing strategy treats BDD as normative reference and separates executable TDD levels: unit, integration/contract, browser, and manual.
- Traceability matrix connects `FR/NFR → AC/method → test/command → evidence`.
- Strategy defines at least three executable TDD cases for the feature and each `US`, `FR`, and `NFR`.
- `[TEST]` tasks precede `[CODE]` tasks for the same behavior.
- `Plan Gate: Passed` requires that TDD predecessors of `[CODE]` tasks are completed with RED status documented.
- Manual verification includes explicit rationale.
- Definition of Done is proven via executable commands or objective evidence.
- Published attestations adhere to schema 2, executable policy digest, explicit limits, commit SHA, and file hash bindings.
- Timeouts return exit code 124; truncated outputs are tagged without exposing bytes beyond limits.

## Single Source of Truth

- The package `specs/<state>/<NNNN>-<slug>/` contains exclusively the normative `spec.md` and optional `research/` with non-normative evidence.
- No parallel `plan.md`, `research.md`, `data-model.md`, `tasks.md`, or checklists exist.
- Gates and evidence live in section 13 of `spec.md`.
- Tasks and progress live in section 14 of `spec.md`.
- Lifecycle strictly follows `Draft → Defined → Planned → Implementing → Complete`; no downstream gate remains approved when an upstream gate is reopened.
