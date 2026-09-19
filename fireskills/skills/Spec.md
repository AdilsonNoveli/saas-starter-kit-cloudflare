# Canonical Contract of the Fireskills Framework

This file defines the overarching rules loaded by `AGENTS.md` and `CLAUDE.md` in consuming projects. It is not a feature specification and does not replace `specs/<state>/<NNNN>-<slug>/spec.md`.

## Canonical Structure

```text
specs/
├── inbox/
│   └── <YYYY-MM-DD-HHMMSS>-<slug>.md
├── backlog/
│   └── <NNNN>-<slug>.md
├── draft/
├── defined/
├── planned/
├── in-progress/
├── review/
└── completed/
    └── <NNNN>-<slug>/
        ├── spec.md
        └── research/
```

- `specs/inbox/` immediately preserves raw inputs without blocking questions or automated promotions.
- `specs/backlog/` organizes ideas prioritized for refinement.
- `specs/<state>/<NNNN>-<slug>/spec.md` is the single canonical source of truth for an engineering slice. It resides in exactly one state folder at a time.
- `research/` stores only inspected external evidence referenced directly by the specification.
- The `spec.md` header is a two-column Markdown table (`Field` and `Value`); each metadata property occupies its own table row.
- Never create standalone `plan.md`, `tasks.md`, `research.md`, `data-model.md` or competing parallel sources of truth.

## State, Effort, and Transition

Physical directory structure and the `Status` header field follow identical progression:

```text
draft → defined → planned → in-progress → review → completed
Draft → Defined → Planned → Implementing → Reviewing → Complete
```

Use `bun run fireskill transition <id> <folder>` for adjacent state transitions (`<id>` is either the number prefix or the full directory slug; `completed` can only return to `review`). The CLI command moves the entire spec bundle and updates the `Status` field.

Every specification maintains `Effort` (integer 1–10), `Effort updated at`, and `Effort rationale` metadata. Effort estimates cognitive reasoning capacity and engineering complexity, not calendar duration: 1–2 targets `light`, 3–6 `standard`, 7–8 `high`, and 9–10 `maximum`. Update it using `bun run fireskill effort <id> <1-10> --reason "<rationale>"` whenever discovery, planning, or execution reveals material information.

`ClickUp Task` may optionally link the spec to an external issue. When `clickupfy-*` skills are present, the responsible skill handles folder and effort synchronization. Local state remains canonical if external integration is missing or unconfigured.

## Persistent Project Context

- `.fireskills/PROJECT.md` at repository root maintains project history, purpose, core capabilities, and high-level boundaries.
- `.fireskills/STACK.md` documents foundational technologies and verified file evidence.
- `.fireskills/RULES.md` contains explicit, confirmed non-negotiable project rules.
- `.fireskills/DATABASE.md` documents the persistent database schema in tabular inventory format.
- `.fireskills/INTERFACE.md` is the canonical design system map: UI stack, tokens, imported @nuxt/ui v4 components, Vue SFC compositions, source files, reusable blocks, and consumer screens.
- `.fireskills/DESIGNSYSTEM.MD` governs macro UI defaults, SaaS CRUD and dashboard patterns, and visual review standards.
- `.fireskills/PACKAGES.md` maintains the package inventory derived from manifests and lockfiles.
- `.fireskills/USER-PROFILE.md` tracks confirmed user expertise level and setup preferences.
- `.fireskills/SPECKIT.md` appears when `.specify/memory/constitution.md` exists, indexing GitHub Spec Kit sources without mutating them.
- Before executing any workflow skill, agents must run `$fireskill-setup` to verify and reconcile project contexts and reserved blocks in `AGENTS.md` and `CLAUDE.md`. The only exception is `$fireskill-setup` itself, which does not self-recurse.
- Run `$fireskill-documentator` whenever `PACKAGES.md` is missing or stale.
- Run `$fireskill-aux-stack` after technology changes, `$fireskill-aux-rules` for confirmed rules, and `$fireskill-aux-database` whenever schema, tables, columns, relations, or migrations change.
- Every task introducing persistent schema changes includes a `[MIGRATION]` task referencing a versioned file generated via `drizzle-kit generate`.

## Cloudflare Workers Runtime Contract

All server-side code in Nuxfire executes on **Cloudflare Workers** (via SST 4). There is ZERO Docker, ZERO Linux server, and ZERO persistent server process.

Mandatory runtime rules:
- `useDB()` constructs a `postgres.js` client **per request** — never cache database clients in module-level global variables.
- `closeDB()` must be invoked via `ExecutionContext.waitUntil()` in Nitro's `afterResponse` and `error` hooks.
- Authentication sessions live in **Cloudflare KV** (`AuthKV`), not Postgres — resetting the database does NOT invalidate sessions.
- NuxtHub storage bindings must be named literally `BLOB`, `KV`, and `CACHE`.
- Durations are **strings**, never numbers: `"120 seconds"`, not `120`.
- Secrets are always uppercase `SCREAMING_SNAKE_CASE` across `.env.example`, `infra/secret.ts`, and `Resource.*`.
- Never use `path.resolve()` inside Worker handler path definitions (breaks asset staging on Windows).
- Deployment is executed via `bun run deploy` (`sst deploy`) targeting Cloudflare Workers.

## Interface Experience Contract

When a feature touches human-facing interfaces, UI discovery cannot be treated as an afterthought. Prior to definition approval, requirements must clarify:

1. Which screens exist and which primary user task each screen completes.
2. How information enters, is queried, mutates, and navigates across screens.
3. Menus, navigation items, routing destinations, permissions, and responsive behavior.
4. Form inputs, groupings, contextual help, validations, actions, and error recovery.
5. Interaction surfaces: full page, slide-over panel, modal overlay, or inline expanded row.
6. Layout density, visual hierarchy, and desktop/mobile responsiveness.
7. Explicit states for loading, empty, error, success, insufficient permissions, and keyboard focus.

### CRUD Contract

When implementing CRUD surfaces, maintain consistency across all views:
- `PageHeader` is a single reusable component shared across list, detail, creation, and edit views with title, description, actions, and breadcrumb slots.
- Lists use `@nuxt/ui` `UTable` configured with `:ui="enterpriseTableUi"` (from `@nuxfire/tokens`) filling full available width.
- The `ID` column remains visible across all record listings.
- Entire table rows act as interactive links navigating to the record detail view.
- Each row provides discrete, accessible edit and delete action buttons with confirmation dialogs for destructive actions.
- Reusable UI blocks must be registered in `.fireskills/INTERFACE.md`.

### Visual Review During Development

Visual inspection is mandatory on every UI task. The `VISUAL` checklist item is positioned between `VERIFY` and `EVIDENCE` to ensure review precedes task completion.

Inspect rendered views against `.fireskills/DESIGNSYSTEM.MD` and `.fireskills/INTERFACE.md`:
- Check borders, margins, padding, and spacing across shell containers, component regions, and fields.
- Check typography: font family, font weight, font size, line-height, letter spacing, and hierarchy.
- Check layout overflow, alignments, keyboard focus outlines, and zoom behavior in desktop and mobile viewports.
- Document review method, tested viewports, and visual adjustments under `VISUAL`. For non-visual tasks, mark `Not applicable` with concrete rationale.

## Numbered Questions Contract

Any skill prompting the user for decisions must follow this structured conversational protocol:

1. Present exactly one numbered question per turn with the label `Question 1`. Await response before formulating follow-up questions.
2. Provide at least three numbered, domain-specific options.
3. Append standard choices: `Write another answer`, `Generate more options`, and `Skip`.
4. When `Generate more options` is selected, provide at least three materially distinct alternatives for the same question.
5. When `Skip` is selected, confirm whether the user wishes to conclude questions for that area, answer later, or continue.
6. Accept flexible inputs (`1`, `Option 1`, or direct text) and resolve selection to the full textual meaning before recording in specs or context files.
7. Limit interactive questioning to a maximum of eight questions per topical area. Once reached, present a synthesis of answered points and list open items for future refinement.

## Conversational Orchestration

Maintain a seamless conversational workflow rather than expecting users to manually invoke CLI commands. Upon completing a task or encountering a dependency belonging to another stage:

1. Inspect current backlog, spec gates, tasks, and evidence to identify the responsible skill.
2. If an issue can be resolved within current skill scope, announce `Pending issue detected: <description> — action: resolving in current step` and fix it directly.
3. If resolution belongs to another skill, declare `Automated transition: $<source> → $<destination> — reason: <reason> — expected result: <result>` and activate the destination skill.
4. Continue in the same conversation turn, preserving accumulated context, artifacts, and decisions.
5. After the target skill resolves the blocker, hand execution back to the caller: `Automated resume: $<destination> → $<source> — blocker resolved: <result>`.

### Development Database Protection

Testing never executes against the development database. In Nuxfire, test runs requiring PostgreSQL must target an isolated test database explicitly separated from stage configuration secrets. vitest suites mock database access via procedure contexts or localized fixtures.

Commands that delete, wipe, or drop database schemas are permanently forbidden (`migrate:fresh`, `migrate:reset`, `schema:drop`, `drizzle-kit drop`, `DROP DATABASE`, `DROP TABLE`, `TRUNCATE`). Explicit user authorization does not waive this guardrail.

## Three Acts and Lifecycle States

- **Act I — Define:** User intent, requirements, domain discovery, and Gherkin BDD scenarios. Ends at `Definition Gate: Passed`.
- **Act II — Design & Prove:** Task breakdown, test design, and RED TDD evidence. Ends at `Plan Gate: Passed`.
- **Act III — Deliver & Validate:** Implementation, GREEN assertions, refactoring, and evidence collection. Ends at `Delivery Gate: Passed`.

State progression:
```text
Draft → Defined → Planned → Implementing → Complete
```

Behavior changes reopen Acts I–III. Pure plan adjustments reopen Acts II–III. Downstream quality gates cannot remain approved over invalidated upstream inputs.

## Execution Discipline

- Faithfully preserve user intent while distinguishing explicit declarations, inferences, assumptions, and open questions.
- Never invent fictitious requirements, stakeholders, constraints, or test evidence.
- Maintain Gherkin BDD scenarios strictly within `spec.md` as reference contracts; never create standalone `.feature` files.
- Define a minimum of three distinct acceptance criteria (`AC`) covering each `US`, `FR`, and `NFR`.
- Implement a minimum of three executable TDD test cases for each feature, tagging each case with its `SPECSFY:` traceability comment marker.
- Maintain the standardized task checklist in exact order: `PREP`, `EXECUTE`, `VERIFY`, `VISUAL`, `EVIDENCE`, and `IMPROVE`.
- Execute test verification via Vitest (`bun run test`).
- Keep tasks, checklists, validation gates, and execution logs embedded directly within `spec.md`.

## Managed Files

In Nuxfire, Fireskills resides directly in `fireskills/`. Workflow skills live in `fireskills/skills/`, templates in `fireskills/skills/templates/`, and example specifications in `fireskills/skills/examples/Spec.md`.

Template resolution order:
1. `.fireskills/templates/custom/<Name>.md` (project-specific overrides, never overwritten).
2. `.fireskills/templates/<Name>.md` (optional local copy).
3. `fireskills/skills/templates/<Name>.md` (framework default).

The `fireskill` CLI (`bun run fireskill`, code in `fireskills/cli/`) executes workflow automation: `transition`, `migrate`, `effort`, `progress`, `milestones sync`, `test`, `validate`, `lesson`, and `config`.
