---
name: fireskill-03-specify
description: "Use when the user asks to promote an inbox capture or refined backlog, create, start, or consolidate a new or in-draft specification in `spec.md`. Also use when an automatic transition requires creating or completing the initial normative source. Initializes specs in `specs/draft/` and applies MCR-10; to change an approved spec use fireskill-update-spec, for questionless capture use fireskill-01-inbox, for refinement use fireskill-02-backlog, and for review without editing use fireskill-04-validate."
---

# Build the Single Specification

## Mandatory Preparation

Before executing this skill, you must load `$fireskill-setup` at the project root.
On automatic handoff, reload it before this step.
Reuse the root confirmed in conversation and do not proceed if setup reports a pending blocker.

## Interaction Mode

Interaction mode: `questions`.
Before formulating any question, read and apply the `Numbered Questions Protocol` from `fireskills/skills/Spec.md`.

Create or update the package `specs/draft/<NNNN>-<slug>/`, where `spec.md` serves as the sole normative source of truth for the entire SDD lifecycle. Only the directory receives the number; keep the file name strictly as `spec.md`. Consolidate discovery, research, clarifications, product rules, technical architecture, data models, contracts, TDD, BDD, validations, tasks, decisions, and conclusion into three explicit acts. Consulted external evidence lives in `research/`; never generate `plan.md`, `research.md`, `data-model.md`, `tasks.md`, checklists, or duplicate specifications.

Before consolidating a spec that depends on external libraries, read `.fireskills/PACKAGES.md`, `docs/packages/README.md`, and entries in `docs/packages/`. If the request provides a GitHub package URL or depends on an npm library, verify whether the package already exists in the workspace and record requirements without duplicating dependencies.

## Orchestrating the Conversation

When concluding this stage or detecting work belonging to another stage, announce
`Pending blocker detected: <description> — action: resolving in this stage` and resolve it
if it falls within scope. When responsibility transfers, announce
`Automatic transition: $fireskill-03-specify → $<target> — reason: <reason> — expected result: <result>`
and immediately load the destination skill, without asking for confirmation or repeating the command. Continue in the same conversation.

After a necessary fix in this stage, announce
`Automatic resumption: $<target> → $fireskill-03-specify — resolved blocker: <result>`
and resume immediately. Re-evaluate state after each handoff to prevent cycles. Handoffs do not require confirmation; sensitive actions still require explicit authorization.

## Preparation

1. Resolve the project root via user-specified directory or `Path.cwd()` if not specified. Do not hunt for or elevate root to an enclosing git parent.
2. When creating a spec, resolve this skill directory and execute before writing:

```bash
node <skill-dir>/scripts/iniciar_spec.mjs \
  --title "<specification title>" [--slug <slug>] [--root <root>]
```

3. Use the absolute path printed by the script. It allocates the next local ID, prefers `.fireskills/templates/custom/Spec.md`, falls back to the managed template `.fireskills/templates/Spec.md`, and creates strictly `specs/draft/<NNNN>-<slug>/spec.md`; never rename the file to include the ID. Without customizations in `.fireskills/templates/`, the script uses `fireskills/skills/templates/Spec.md`.
4. When updating, use the provided or discovered existing spec path under current root; do not rerun the initializer.
5. Read source inbox capture from `specs/inbox/`, backlog item, backlog refinement brief, current request, the spec at that path, its `research/` directory, and repository files revealing real constraints.
6. If information is insufficient to identify problem, actor, and outcome, announce the blocker and load `$fireskill-02-backlog` to execute the question cycle. Resume this skill upon completion and use the produced brief.
7. Read `references/mcr-10.md` when receiving narrative, user stories, transcripts, or specifications to refine.
8. Read `.fireskills/DATABASE.md` when present. If journeys depend on persisted data and the file does not explain what data must be stored, who uses it, or retention policies, load `$fireskill-data-discovery` and resume this skill once records are confirmed.

## Apply MCR-10

1. Preserve original user wording and identify practical purpose, actor, and outcome.
2. Analyze ambiguous terms, terminological equivalences, and derivations.
3. Use substance, quantity, quality, relation, place, time, posture, state, action, and affection as adaptive analytical lenses, not as a rigid questionnaire.
4. Distinguish user statements from analyst/AI inferences, hypotheses, decisions, conflicts, or open questions.
5. If applicable gaps remain, load `$fireskill-02-backlog` to run the cycle (max 8 questions per area) and resume this skill upon completion. If the user chooses `Proceed`, apply confirmation and recording rules per central contract. Maintain `Status: Draft` and `Definition Gate: Pending` while applicable gaps remain; do not promote spec to `Defined` and do not reopen the same cycle during this resumption.
6. Recombine decisions into statements containing subject, condition, action, and observable effect; derive rules, user stories, Gherkin scenarios, boundaries, and failure modes.
7. Record results into existing sections of `spec.md`; do not produce separate MCR reports or duplicate references into the slice folder.

## Writing

- Always save to `<root>/specs/draft/<NNNN>-<slug>/spec.md`; the ID belongs to the directory and the file remains strictly `spec.md`.
- Use `<root>/specs/draft/<NNNN>-<slug>/research/` exclusively for consulted copies, snapshots, contracts, schemas, examples, and provenance notes. Never place production code, tests, or normative files in this directory.
- When researching external APIs or documentation, store permissible evidence in `research/` and index path, origin, version/date, license, and impact in `Stored research artifacts`. If licensing prohibits copies, store metadata, URL, access date, checksum/version, and original notes without reproducing protected content.
- Outside of `spec.md` and `research/`, create no additional files or directories in the feature slice.
- When promoting `specs/backlog/<NNNN>-<slug>.md`, record its path in the spec and update the backlog item to `Status: Promoted` with the created spec path. Backlog retains provenance but ceases governing system behavior.
- When deriving directly from `specs/inbox/<timestamp>-<slug>.md`, record the path in the spec and keep the capture intact. Initial analysis represents context, not confirmed requirements.
- Maintain header as a two-column Markdown table with columns `Field` and `Value`; do not convert metadata into `**Field**: value` lines.
- In the table, declare `ID` as `SPEC-NNNN` and `Slug` as `<NNNN>-<slug>`, matching the parent folder name.
- Preserve exactly the three acts and 18 sections of the resolved template (`.fireskills/templates/custom/Spec.md` or `.fireskills/templates/Spec.md`).
- Replace remaining boilerplate and template guidance during refinement; do not leave examples or placeholders in a spec promoted to `Defined`.
- When updating, modify the existing file and preserve valid IDs and decisions.
- Number new items without reusing or renumbering deleted IDs:
  - Stories: `US-001`;
  - Functional requirements: `FR-001`;
  - Non-functional requirements: `NFR-001`;
  - Acceptance criteria: `AC-001`;
  - Decisions: `DEC-001`.
- Write each requirement as verifiable behavior.
- Write each scenario in Given/When/Then format and map it to at least one requirement.
- Define a minimum of three distinct `AC`s for the entire feature and for each `US`, `FR`, and `NFR`. Coverage counts only when the `AC` explicitly declares the target ID in `**Covers**`; include happy path, critical business variations/rules, and failure or boundary conditions.
- Include out-of-scope boundaries, error states, constraints, security, and accessibility where relevant.
- When header declares `Human Interface: Yes`, complete in section 10 all nine template areas: local stack and conventions, screens, information flow, menus and primary navigation, forms and actions, layout composition, Vue and `@nuxt/ui` components, states, and accessibility. Use `.fireskills/INTERFACE.md`, `.fireskills/STACK.md`, manifests, existing screens, and code as sources of truth; record what is preserved and what is altered. Do not propose incompatible libraries or restructure existing screens without this analysis.
  Load `$fireskill-specialist-ux-design`, `$fireskill-specialist-ui-design`, and the UI stack specialist. Never accept a CRUD specification limited solely to API, database, or backend services.
  In Nuxfire, explicitly document `@nuxt/ui` components (`UTable`, `UForm`, `UModal`, etc.), all planned Vue components, their responsibilities, file paths, base components, and reuse rules. The page component simply composes these units.
- When no interface exists, declare `Human Interface: No` and explain why the deliverable is not consumed directly by humans on screen.
- Keep technical sections concrete enough to produce file-path-specific tasks, without confusing internal implementation details with user-facing outcomes.
- Record reversible defaults in `Assumptions`; request clarification only when plausible options materially alter scope, data, security, UX, or test strategy.
- Never leave placeholders, template examples, `TBD`, `TODO`, or clarification flags in a file marked `Defined`.
- Keep future tasks in section `14. Tasks`; downstream skills update this section directly, never creating separate task files.
- Use metadata fields `Definition Gate`, `Plan Gate`, and `Delivery Gate` to track readiness without generating separate reports.

## Respect Approved Specs

If a spec already holds `Definition Gate: Passed` and the user asks to add, remove, fix, or modify requirements, announce the pending blocker and automatically load `$fireskill-update-spec`. That skill assesses impact, updates the normative source, and invalidates only affected gates. Resume this skill only if changes return the spec to initial draft status.

## Preserve Traceability

For each `FR` and `NFR`, map at least three `AC` scenarios and specify explicit verification methods for NFRs. For each story, identify requirements delivering its value and at least three `AC`s. Carry these IDs forward into TDD test cases and section 14.

## Control Research

- Prior to planning, load only indexed evidence and validate claims with:

```bash
node fireskills/skills/fireskill-03-specify/scripts/load_research.mjs \
  specs/<state>/<NNNN>-<slug>/spec.md
```

- For material research, record `R-ID`, criticality, claim, verdict, confidence, local evidence, and budget in section 2. Any `critical` claim not yet verified blocks handoff; refuted claims remain documented. IDs must be unique, expenses must stay within budget limits, and cited Markdown anchors must resolve in local files.

## Self-Validate

While the spec is in Draft, run intermediate structural validation:

```bash
node fireskills/skills/fireskill-04-validate/scripts/validate_spec.mjs specs/<state>/<NNNN>-<slug>/spec.md --allow-draft
```

Resolve structural errors within a maximum of three iterations. The `fireskill-04-validate` skill conducts semantic review, records results in section 13, and promotes `Definition Gate: Passed` and `Status: Defined`. Until then, maintain `Status: Draft`, `Definition Gate: Pending`, and report blocking decisions.

## Reporting

Report:

- Path `specs/<state>/<NNNN>-<slug>/spec.md`;
- Stored research artifact paths or explicit statement that no external sources were used;
- Status;
- Count of `US`, `FR`, `NFR`, and `AC`;
- Material assumptions;
- Automatic transition to `$fireskill-04-validate`, stating reason and expected result.

## Specialists on Demand

Read [references/specialists.md](references/specialists.md) when requirements, NFRs, data models, or technical decisions require specialized domain expertise. Record the requirement in the spec and propose loading the specialist. If not installed, request explicit user authorization before installing.
