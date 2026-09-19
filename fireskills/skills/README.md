# Fireskills Skills

This module maintains the executable methodology of Fireskills: skills,
deterministic scripts, references, assets, and metadata for agents.

The overall overview is in [`README.md`](../README.md). Public usage documentation
is in `apps/web/content/docs/2.fireskills/` (site: `/docs/fireskills`).

## Responsibilities

This module contains:

- Operational instructions for workflow skills (01 to 07, `update-spec`, `progress`,
  `interviewer`, milestones, and `data-discovery`), setup, documentator, three
  auxiliary skills, and governance skills (`lessons`, `the-fool`, `the-jury`,
  `the-judge`).
- Templates for inbox, backlog, spec, tasks, project, stack, rules, database,
  interface, user profile, and design system in `templates/`, and the example in
  `examples/Spec.md`.
- MCR-10 and quality gate references.
- Validation, traceability, evidence, and progress scripts.
- Discovery metadata in `agents/openai.yaml`.
- Example fixture `examples/Spec.md`. Skills check repo integrity via
  `fireskill-04-validate/scripts/verify_repo.mjs`.

Specs belong to the consumer project (here, Nuxfire). Technical knowledge belongs
to [`specialists/`](../specialists/).

## Executable Methodology

The workflow preserved by the skills is:

```text
capture immediately in specs/inbox
  → refine in backlog
  → specify
  → validate definition
  → plan tasks
  → use spec BDD to prove TDD RED
  → implement GREEN
  ↳ update spec and reopen workflow when a late request emerges
  → rebuild technical documentation
  → validate delivery
  → query progress
```

Each slice uses a single normative source in `specs/<state>/<NNNN>-<slug>/spec.md`
and traverses:

```text
Draft → Defined → Planned → Implementing → Complete
```

No `Definition Gate`, `Plan Gate`, or `Delivery Gate` passes without evidence
compatible with the corresponding act.

Implementation tasks use the checklist: `PREP`, `EXECUTE`, `VERIFY`, `VISUAL`,
`EVIDENCE`, and `IMPROVE`. The `VISUAL` step is mandatory for every task that could
alter the interface, even without explicit request, and records inspection of
borders, spacing, margins, padding, and typography. Tasks without interface changes
record the concrete reason for non-application.

## Conversational Orchestration

Skills perform handoffs within the same conversation. When a responsibility
concludes or encounters a blocker from another step, the current skill:

1. Announces `Pending blocker detected` when blocking work is found.
2. Announces `Automatic transition`, with origin, destination, reason, and expected outcome.
3. Immediately loads the destination skill without asking confirmation or repeating commands.
4. Preserves context and resolves the blocker in the same conversation.
5. Announces `Automatic resumption` and returns to origin step once correction finishes.

The protocol also applies to returns. Late requests enter through `fireskill-update-spec`.
Behavior changes reopen definition and validation, plan changes return to tasks,
and missing tests or RED call TDD/BDD. Handoff is automatic, but does not authorize
installation, deployment, publishing, or destructive actions, which still require
explicit user authorization.

Every missing material decision is handled by `fireskill-02-backlog`. The skill
re-evaluates context after each round and asks again while applicable gaps exist,
up to a maximum of eight questions per area. Each round contains exactly one
numbered question with three or more options, `Write another answer`, `Generate more options`,
and `Advance` from the first round. Advancing preserves gaps in Draft and does not
approve the Definition Gate.

In setup, the agent reads `.fireskills/USER-PROFILE.md`, the conversation, and
project contexts before asking. Confirmed answers are not asked again. The profile
records technical knowledge level and guides depth: beginners receive explanations
of terms and practical effects, while experienced developers can answer directly
about versions, architecture, tests, and integrations. Setup also confirms when an
entity requires CRUD, maps screen access via system menus, and asks when these two
pieces of information are unclear. At the conclusion of full execution, it calls the
documentator to rebuild system technical documentation.

## Catalog

| Skill | Responsibility | Primary Boundary |
| --- | --- | --- |
| [`fireskill-01-inbox`](fireskill-01-inbox/SKILL.md) | Preserve and pre-process input without questions | Does not refine, promote, or implement |
| [`fireskill-02-backlog`](fireskill-02-backlog/SKILL.md) | Refine entries, record backlog, and close gaps in adaptive cycle with MCR-10 | Does not create specifications |
| [`fireskill-03-specify`](fireskill-03-specify/SKILL.md) | Promote decisions to `spec.md` and research | Does not implement or capture vague ideas |
| [`fireskill-04-validate`](fireskill-04-validate/SKILL.md) | Audit Definition Gate | Does not decide requirements |
| [`fireskill-05-tasks`](fireskill-05-tasks/SKILL.md) | Maintain tasks in sections 14–15 | Does not create `tasks.md` or code |
| [`fireskill-06-tdd-bdd`](fireskill-06-tdd-bdd/SKILL.md) | Use spec BDD to create TDD and prove RED/GREEN | Does not execute Gherkin or invent behavior |
| [`fireskill-07-implement`](fireskill-07-implement/SKILL.md) | Execute ready tasks and record evidence | Does not work without RED |
| [`fireskill-update-spec`](fireskill-update-spec/SKILL.md) | Incorporate late request and reopen only affected acts | Does not create new spec or implement |
| [`fireskill-progress`](fireskill-progress/SKILL.md) | Project global status | Does not alter gates or checkboxes |
| [`fireskill-mvp-milestone-interviewer`](fireskill-mvp-milestone-interviewer/SKILL.md) | Interview and define MVP by milestones | Does not plan tasks or code |
| [`fireskill-data-discovery`](fireskill-data-discovery/SKILL.md) | Converse about information product needs to store | Does not choose technology or implementation |
| [`fireskill-roadmap-milestone-interviewer`](fireskill-roadmap-milestone-interviewer/SKILL.md) | Interview post-MVP evolution | Does not alter core without confirmation |
| [`fireskill-milestone-governor`](fireskill-milestone-governor/SKILL.md) | Synchronize milestone projection | Does not invent exit conditions |
| [`fireskill-setup`](fireskill-setup/SKILL.md) | Detect stack, create missing context, prepare `.fireskills/DESIGNSYSTEM.MD`, maintain interaction profile, and reconcile agent instructions | Does not overwrite existing context files |
| [`fireskill-documentator`](fireskill-documentator/SKILL.md) | Rebuild `docs/` and inventory `.fireskills/PACKAGES.md` | Does not invent decisions, relations, or references |
| [`fireskill-aux-stack`](fireskill-aux-stack/SKILL.md) | Maintain `.fireskills/STACK.md` from executable evidence | Does not invent or copy all dependencies |
| [`fireskill-aux-rules`](fireskill-aux-rules/SKILL.md) | Help record confirmed rules in `.fireskills/RULES.md` | Does not decide rules for the user |
| [`fireskill-aux-database`](fireskill-aux-database/SKILL.md) | Maintain `.fireskills/DATABASE.md` after persistence changes | Does not copy data or secrets |
| [`fireskill-lessons`](fireskill-lessons/SKILL.md) | Record lessons learned with signal, preventive rule, and source in `.fireskills/LESSONS.md` | Only records lessons grounded in actual failures |
| [`fireskill-the-fool`](fireskill-the-fool/SKILL.md) | Stress-test spec, plan, or decision (pre-mortem, unverified assumptions) | Does not fix or approve gates |
| [`fireskill-the-jury`](fireskill-the-jury/SKILL.md) | Collegial deliberation of 3 to 5 subagents for high-impact decisions | Not for trivial tasks |
| [`fireskill-the-judge`](fireskill-the-judge/SKILL.md) | Review diff or PR with `file:line` evidence and verdict | Does not comment on issues local tools catch |

All context files (`PROJECT.md`, `INTERFACE.md`, `DESIGNSYSTEM.MD`, `STACK.md`,
`RULES.md`, `DATABASE.md`, `PACKAGES.md`, `USER-PROFILE.md`, `LESSONS.md`) reside
in `.fireskills/`. Setup can be re-run to ensure initial contexts; the documentator
ensures package inventory. Both preserve existing files and content outside
managed blocks.

When the project uses GitHub Spec Kit, the constitution in
`.specify/memory/constitution.md` activates a read bridge. Setup traverses regular
files in `specs/`, creates `.fireskills/SPECKIT.md` with found paths and fingerprints,
and directs agents to read original sources. No file in `.specify/` or `specs/` is
moved, converted, replaced, or removed.

During planning, implementation, and progress projection,
`fireskill-setup/scripts/monitor_context.mjs` classifies staged, unstaged, and
untracked changes. Structural changes require `STACK.md`. Persistence changes
require `DATABASE.md`. Application code requires review of `.fireskills/PROJECT.md`.
The absence of material impact is recorded in task evidence, never silently assumed.

`fireskill-documentator` works independently and is also a mandatory handoff after
each implementation task. In every execution, it re-evaluates existing code and
rebuilds architecture, application, database, flows, tests, frontend, packages,
integrations, and decisions within managed blocks of `docs/`. The same execution
fills `.fireskills/PACKAGES.md` with all observed npm/Bun packages, direct or
transitive, and their local purposes, preserving external human text.

## Native Capabilities

Skills incorporate capabilities inspired by specification development extensions
without requiring an extra runtime or parallel sources:

| Capability | Responsible |
| --- | --- |
| Quality gates | `fireskill-04-validate` |
| CI protection | `fireskill-04-validate` |
| Task verification | `fireskill-07-implement` |
| Interface visual review | `fireskill-07-implement` and interface specialists |
| Spec traceability | `fireskill-06-tdd-bdd` |
| Spec reference loading | `fireskill-03-specify` |
| Research structure | `fireskill-03-specify` |
| What-if scenario analysis | `fireskill-update-spec` |
| Spec changelog | `fireskill-update-spec` |
| Spec critique | `fireskill-04-validate` |
| Architectural protection | `fireskill-04-validate` |
| Security review | `fireskill-04-validate` |
| Quality testing | `fireskill-06-tdd-bdd` |
| Token consumption analysis | `fireskill-progress` |
| PR integration | `fireskill-07-implement` |

## Specialists on Demand

Each base skill includes `references/specialists.md` with conditions to recommend
technical context. Specialists reside in `fireskills/specialists/` and are loaded
by name (`$fireskill-specialist-<name>`) in the same conversation. An absent
specialist requires name, purpose, dependencies, and explicit authorization before
being copied; copying never occurs as an implicit side effect of a handoff.

## Structure

```text
templates/
├── Inbox.md, Backlog.md, Spec.md, and Tasks.md
└── Project.md, Stack.md, Rules.md, Database.md, UserProfile.md, Interface.md, and .fireskills/DESIGNSYSTEM.MD
examples/
└── Spec.md        # filled fixture for agents, CLI, and tests
fireskill-{<stage>|setup|documentator|aux-<responsibility>|<governance>}/
├── SKILL.md
├── agents/
│   └── openai.yaml
├── scripts/       # deterministic automation
├── references/    # skill reference knowledge
└── assets/        # templates and output materials
```

- `SKILL.md` contains frontmatter with `name` and `description`.
- `agents/openai.yaml` references `$<skill-name>` in the default prompt.
- Scripts use Python 3 or Node.js with standard libraries, avoiding network access or destructive actions by default.
- Extensive references live one level below the skill and have explicit read triggers.
- Normative rules have a single source of truth; other files link to it.
- The CLI publishes templates and example under `.fireskills/`. Only a spec created from the template becomes normative for a feature.
- `.fireskills/DESIGNSYSTEM.MD` guides macro interface rules in the consumer project; `.fireskills/INTERFACE.md` maintains the local inventory of components and screens.

## Available Commands

The workflow engine is the `fireskill` CLI (code in `fireskills/cli/`), executed
from project root with `bun run fireskill <command>`: `transition`, `migrate`,
`effort`, `progress`, `milestones sync`, `test`, and `config`. Skills do not
require separate installation: they reside in this repository.

## Development Workflow

Behavior changes follow:

```text
spec → Gherkin → TDD test → RED → skill/script → GREEN → regression → evidence
```

The technical cycle remains `RED → GREEN → REFACTOR`.

Skill tests and fixtures reside in this module and only create specs in temporary
directories.

In consumer projects, the test runner for tests derived from BDD is selected by
the stack. In Nuxfire, the runner is Vitest (`bun run test`). Gherkin remains only
in `spec.md` as reference: agents derive executable tests from it without creating
or executing `.feature` files. In Nuxfire, the runner decision is Vitest (`bun run test`).
Each feature, story, and requirement receives at least three distinct BDD scenarios
and three executable TDD cases. Each TDD case has its own `SPECSFY:` marker.

## Validation

Validate each altered skill:

```bash
node fireskill-04-validate/scripts/verify_repo.mjs . --boundary local
```

The repository verifier checks all base skills, catalog contracts, setup,
documentator, auxiliary skills, and installed specialists.

## Publishing Checklist

Before publishing:

- Frontmatter and metadata are valid.
- Positive triggers and negative boundaries are clear.
- No placeholders, caches, or broken local links exist.
- TDD tests informed by BDD had a valid RED phase and are green.
- Requirements, tests, tasks, and evidence are traceable.
- Workspace regression tests pass.
- The integrated diff maintains coherence across this module and consumers.
