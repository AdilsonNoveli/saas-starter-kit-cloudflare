---
name: fireskill-setup
description: Prepare and monitor project contexts, including constitution and preserved specs from GitHub Spec Kit projects.
---

# Prepare Project Context

## Interaction Mode

Interaction mode: `questions`.
Before formulating any question, read and apply the `Numbered Questions Protocol` from `fireskills/skills/Spec.md`.

## Knowledge Profile and Answer Memory

Setup conducts a brief adaptive interview. It never applies a rigid questionnaire nor re-asks questions already confirmed.

Before formulating any question, read in this exact order:

1. `.fireskills/USER-PROFILE.md`, when present;
2. Current conversation and previously supplied answers;
3. `.fireskills/PROJECT.md`, `.fireskills/DESIGNSYSTEM.MD`, `.fireskills/STACK.md`,
   `.fireskills/RULES.md`, `.fireskills/DATABASE.md`, and `.fireskills/PACKAGES.md`;
4. `AGENTS.md`, `CLAUDE.md`, `.fireskills/SPECKIT.md`, and related sources listed within, when present;
5. Applicable inbox captures, backlog items, and specs, without modifying these files.

Mentally map resolved topics. An explicit user statement or unequivocal context in documentation answers a topic, even if expressed with different terminology. Never request confirmation, choices, or reformulations for resolved facts. Query solely for genuine gaps, contradictions, or details changed since the last confirmation.

When overall user experience level is not yet recorded in the profile or conversation, present this initial round:

```text
Question 1. How would you prefer to receive guidance during this setup?
1. Beginner: explain technical terms and the practical effect of each choice before proceeding.
2. Intermediate: I know the fundamentals and prefer concise explanations alongside choices.
3. Experienced: I can respond with technical details on stack, architecture, commands, and integrations.
4. Write another response
5. Generate more options
6. Proceed
```

Normalize the response to `beginner`, `intermediate`, or `experienced`, recording it in `.fireskills/USER-PROFILE.md` with source and timestamp. If the profile already has a confirmed level, use it without re-asking. If conversation and profile present divergent levels, ask exactly one question to resolve the conflict and update the record.

Adapt interview depth by round:

- `beginner`: Explain technical terms inline, state why information is required, and outline practical effects of each option;
- `intermediate`: Use standard technical vocabulary and append short explanations only when choices could be ambiguous;
- `experienced`: Inquire directly about versions, framework boundaries, authentication, persistence, testing strategy, UI layout, deployment, or integrations when open.

User experience level adjusts phrasing; it never authorizes guessing answers. If the user demonstrates divergent familiarity across areas, adapt that area without changing overall level unless confirmed. After each response, update the profile, remove the topic from open gaps, and select the next question. Respect the limit of eight questions per area and the remaining rules of the numbered contract.

## Adaptive Setup Workflow

After confirming directory and inspecting the codebase, select the first necessary topic lacking confirmed answers:

1. Product objective and primary outcome;
2. User personas, teams, and roles;
3. Access, authentication, and authorization policies;
4. Core data entities, relationships, and retention rules;
5. Screens, navigation paths, and interface states;
6. Testing, observability, and deployment pipelines;
7. External integrations and dependent services.

Consult the topic map before each round. If sources state facts clearly, record provenance in the profile and proceed to the next topic. If two sources diverge, ask solely to resolve the contradiction. If all applicable topics are confirmed, announce that setup proceeds to file reconciliation without asking synthetic questions.

Adapt question formulation to user level. Each round presents one question, numbered options, `Write another response`, `Generate more options`, and `Proceed`. After receiving an answer, normalize content, record area, topic, answer, source, timestamp, and scope in `.fireskills/USER-PROFILE.md`, then proceed.

## Mandatory Functional Coverage in Setup

While inspecting the product, map each business entity to actions users must perform. When journeys demand managing records, confirm coverage for create, read, update, and delete (CRUD). Never force CRUD onto read-only catalogs, immutable logs, event streams, or data maintained via third-party integrations. If sources omit needed actions, confirm with the user via a numbered question round before recording coverage.

For recurring operational screens, identify navigation paths through system menus and document menu item, target route, required permissions, and responsive behavior in `.fireskills/INTERFACE.md`. Technical callback routes or intermediate redirect steps may reside outside menus when the journey demonstrates access. If route placement or menu presence is ambiguous, clarify with the user in a single round.

Setup records these requirements into persistent context and routes behavioral changes to backlog and spec. It never creates screens, routes, or database schemas independently. Subsequent implementation covers confirmed CRUD operations and navigation links with dedicated tasks and tests.

During every full setup run, load `$fireskill-documentator` after reconciling context files and specialists. Rebuild system documentation across `docs/` and `.fireskills/PACKAGES.md`, even without recent changes in code, schema, or dependencies. Preserve human prose outside managed blocks and resolve any `PENDING` flags before concluding.

## Database Protection During Setup

Before running tests accessing Postgres, execute during setup:

```bash
node fireskills/skills/fireskill-setup/scripts/check_database_safety.mjs \
  --project <root>
```

Require a dedicated test database explicitly separate from staging secrets (`DATABASE_HOST`, `DATABASE_NAME`, etc.); existing Vitest test suites (billing, team seats, abilities) do not connect to the database. The script never outputs credentials or secret connection strings.

A `PENDING` result halts all focal, suite, or regression tests. Correct the test environment, rerun verification, and proceed only after `SAFE`. Never run tests against development databases, even for debugging. An `IGNORED` result flags commands or configurations capable of dropping structures or data; never execute the command and never offer an option to force execution.

## Execution Sequence

1. Before reading or writing, confirm project directory. In the first run of the conversation, if a path was already specified, resolve it to absolute path and state it. When unspecified, offer: `1. Use current directory.`, `2. Use a Hub subdirectory.`, and `3. Provide another path.`. Never deduce destinations via Git parent boundaries. In subsequent mandatory runs in the same conversation, reuse confirmed root without repeating the question.
2. Use confirmed root in all commands. When working in a Hub, execute within selected subdirectory or supply `--project <root>` and `--root <root>` to scripts. Never create contexts, specs, tests, or code in parent directories.
3. Read `AGENTS.md`, `CLAUDE.md`, and local instructions from confirmed root before writing. Next, run `node scripts/inspect_project.mjs --project <root>`. Read sources in returned order: instructions, manifests, configuration, application, routes, persistence, integrations, interface, tests, and documentation. Do not start discovery or propose stack changes before understanding current system state.
4. Read [framework instructions guidelines](references/framework-instructions.md) when auditing reserved blocks in agent files.
   When `.specify/memory/constitution.md` exists, read [GitHub Spec Kit compatibility](references/github-spec-kit.md).
5. Verify prerequisites before preparing context: Node.js (for `.mjs` scripts), Bun (`bun run fireskill`), Git, and write access. Resolve any missing prerequisite.
6. Run `node scripts/setup_context.mjs --project <root>`.
   Render `.fireskills/PROJECT.md`, `STACK.md`, `RULES.md`, `DATABASE.md`,
   `.fireskills/INTERFACE.md`, `.fireskills/DESIGNSYSTEM.MD`, and `.fireskills/USER-PROFILE.md` from `.fireskills/templates/custom/<Name>.md` when present, or managed templates `.fireskills/templates/Project.md`, `Stack.md`, `Rules.md`, `Database.md`, `Interface.md`, `DESIGNSYSTEM.MD`, and `UserProfile.md` otherwise; do not maintain parallel inline templates in scripts. `.fireskills/DESIGNSYSTEM.MD` resides at project root, initializes with SaaS defaults, and is created only when missing. The command reads the constitution and regular files in `specs/` when GitHub Spec Kit is detected, updating the managed block of `.fireskills/SPECKIT.md`.
   Initial setup does not create `SEMVER` or modify `infra/`. Versioning and deployment start only when explicitly requested; in that case, announce handoff to `$fireskill-specialist-sst` (with `$fireskill-specialist-versioning`).
   Setup execution is strictly idempotent: rerunning with identical inputs preserves reconciled files, does not duplicate blocks, and triggers no downstream phase.
7. At start and end of every slice, execute:

   ```bash
   node scripts/monitor_context.mjs --project <root> --check
   ```

   Before database-backed tests, run `check_database_safety.mjs --project <root>` and keep test execution suspended until `SAFE`.

8. Inspect initial files, including `.fireskills/USER-PROFILE.md` and `.fireskills/PACKAGES.md`. When `.fireskills/SPECKIT.md` exists, open constitution and original sources listed in projection.
   Before any UI discovery, run `node scripts/inspect_interface.mjs --project <root>` and inspect current routes, components, and screens related to the request. The report guides analysis without replacing direct source inspection. General project inspection covers authorization rules, roles, data models, integrations, routes, screens, components, states, tests, and documentation. On large codebases, inspect in groups and report reviewed sources before proposing changes.
9. Never overwrite existing context files. In `AGENTS.md`, `CLAUDE.md`, and `.fireskills/SPECKIT.md`, update only the delimited framework block and preserve all content outside it. Never write, move, rename, or delete files in `.specify/` or `specs/`.
10. After reading stack, first load the Fireskills core:
    `fireskill-specialist-data-modeling`,
    `fireskill-specialist-domain-modeling`,
    `fireskill-specialist-software-architecture`, and
    `fireskill-specialist-nuxt-ui`.
    Next, present the correspondence table below with core and specialists detected via manifests. Specialists reside in `fireskills/specialists/`: no installation required; load the core and detected specialists demanded by the current stage.
11. To complete or adjust stack, rules, or database, announce handoff and load `$fireskill-aux-stack`, `$fireskill-aux-rules`, or `$fireskill-aux-database` respectively.
12. In every full setup run, load `$fireskill-documentator` following auxiliary skills and reconstruct `docs/` and `.fireskills/PACKAGES.md`.
13. Only when user explicitly requests Gitflow (see [references/gitflow.md](references/gitflow.md)), announce handoff, load `$fireskill-specialist-gitflow`, and record branch conventions in `RULES.md` via `$fireskill-aux-rules`. Never assume Gitflow based on repository branches or presence of a `develop` branch.

Do not bypass a `PENDING` result. Update indicated documents and rerun monitor. For application changes without material shift in purpose or capabilities, document rationale and repeat with `--acknowledge-project-no-change`. Apply same rigor to rules with `--acknowledge-rules-no-change`; never use flags to mask genuine documentation debt.

Keep `.fireskills/PROJECT.md`, `.fireskills/INTERFACE.md`, and `.fireskills/DESIGNSYSTEM.MD` at root. Maintain `STACK.md`, `RULES.md`, `DATABASE.md`, `PACKAGES.md`, `USER-PROFILE.md`, and optional `SPECKIT.md` in `.fireskills/`. Treat these as project-derived context, not as specs, gates, or implementation authorization.

In multi-framework projects, document all observed sources; do not arbitrarily select a single stack. If no framework is identified, produce generic templates with confirmation pending.

## Stack and Specialists Loaded by Setup

| Observed Stack | Loaded Specialist |
| --- | --- |
| Nuxt (`nuxt.config.ts`) | `fireskill-specialist-nuxt` |
| `@nuxt/ui` | `fireskill-specialist-nuxt-ui` |
| Nuxfire Layers (`layers/`, `layer.manifest.ts`) | `fireskill-specialist-nuxfire-layers` |
| tRPC (`trpc-nuxt`) | `fireskill-specialist-trpc` |
| Drizzle (`drizzle.config.ts`) | `fireskill-specialist-drizzle` |
| PostgreSQL | `fireskill-specialist-postgres` |
| SST (`sst.config.ts`, `infra/`) | `fireskill-specialist-sst` |
| Cloudflare Workers (`apps/functions`) | `fireskill-specialist-cloudflare-workers` |
| OpenAuth.js | `fireskill-specialist-openauth` |
| `nuxt-authorization` | `fireskill-specialist-nuxt-authorization` |
| Pinia | `fireskill-specialist-pinia` |
| Stripe or Paddle (`layers/billing`) | `fireskill-specialist-billing` |
| TypeScript | `fireskill-specialist-typescript` |
| Tailwind CSS | `fireskill-specialist-tailwind-css` |
| OpenAPI | `fireskill-specialist-web-api-design` |
| OpenTelemetry or Prometheus | `fireskill-specialist-observability` |
| CI/CD | `fireskill-specialist-delivery-engineering` |

| Core Loaded in Every Setup | Purpose |
| --- | --- |
| `fireskill-specialist-data-modeling` | Data models, entities, relationships, lifecycle |
| `fireskill-specialist-domain-modeling` | Domain language, business rules, boundaries |
| `fireskill-specialist-software-architecture` | Modules, dependencies, technical architecture |
| `fireskill-specialist-nuxt-ui` | `@nuxt/ui` components, theming, UI and CRUD patterns |

For all Nuxfire projects, setup loads `fireskill-specialist-nuxt-ui`: `@nuxt/ui` v4 is the foundational UI and CRUD design system.

Verify actual runtime before approving setup: Cloudflare Workers via SST (`sst.config.ts`, `infra/`), Postgres via Hyperdrive and Drizzle. Record this combination in `.fireskills/STACK.md`.

After loading specialists, setup records in `.fireskills/INTERFACE.md` that screens are composed of Vue SFCs with `@nuxt/ui` components. Every new screen consults existing patterns and registers custom components and `@nuxt/ui` components with actual consumers.
