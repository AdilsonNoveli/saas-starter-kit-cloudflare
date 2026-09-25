# Fireskills

Specification-driven software engineering methodology tailored for the Nuxfire stack.

Fireskills is a comprehensive methodology transforming intent into production software — with deep context, executable contracts, BDD/TDD tests, and verified evidence. It is the normative engineering framework for this repository.

## Project Stack

Nuxfire is a multi-tenant SaaS starter kit running entirely on Cloudflare Workers:

- **Runtime**: Cloudflare Workers via SST 4 — ZERO Docker, ZERO Linux servers
- **Frontend**: Nuxt 4 + @nuxt/ui v4 (Reka UI + Tailwind CSS) — ZERO React, ZERO Next.js, ZERO Astro
- **API**: tRPC v10 via trpc-nuxt — ZERO pure REST, ZERO GraphQL
- **Auth**: OpenAuth.js — ZERO Lucia, ZERO Clerk, ZERO NextAuth
- **Database**: PostgreSQL via Cloudflare Hyperdrive + Drizzle ORM — ZERO Prisma, ZERO D1, ZERO SQLite
- **Authorization**: nuxt-authorization (Bouncer-style RBAC) — ZERO CASL
- **State**: Pinia — ZERO Vuex, ZERO Zustand
- **Deploy**: SST 4.14.0 → Cloudflare Workers (`bun run deploy`)
- **Payments**: Stripe + Paddle (both active)
- **Email**: Resend
- **Tests**: Vitest — ZERO Jest, ZERO Playwright (for now)
- **Package Manager**: Bun workspaces

## Methodology

The mandatory workflow is:

```
input → inbox → backlog → spec → validate → tasks → TDD/BDD → implement → documentator → progress
```

Three acts:
- **Act I — Define**: Inbox → Backlog → Spec → Validate
- **Act II — Design/Prove**: Tasks → TDD/BDD
- **Act III — Deliver**: Implement → Documentator → Progress

Three quality gates:
- **Definition Gate**: validates specification before planning
- **Plan Gate**: validates tasks, test design, and migrations before coding
- **Delivery Gate**: validates completed work and evidence before closing

## Core Skills

| Skill | Purpose |
|---|---|
| `fireskill-01-inbox` | Captures raw ideas without blocking questions |
| `fireskill-02-backlog` | Refines backlog candidates and options |
| `fireskill-03-specify` | Authors canonical specification |
| `fireskill-04-validate` | Proves Definition Gate compliance |
| `fireskill-05-tasks` | Decomposes spec into ordered tasks |
| `fireskill-06-tdd-bdd` | Creates BDD-informed TDD tests |
| `fireskill-07-implement` | Implements changes (RED → GREEN → REFACTOR) |
| `fireskill-setup` | Reconciles and verifies project context |
| `fireskill-documentator` | Rebuilds technical documentation inventory |
| `fireskill-update-spec` | Manages late specification changes |
| `fireskill-progress` | Projects global workflow progress |
| `fireskill-interviewer` | Interactive specification dialog |
| `fireskill-mvp-milestone-interviewer` | Defines MVP by demonstrable state boundaries |
| `fireskill-roadmap-milestone-interviewer` | Plans post-MVP product milestones |
| `fireskill-milestone-governor` | Maintains milestone links and `specs.md` index |
| `fireskill-data-discovery` | Discovers domain entity storage requirements |
| `fireskill-lessons` | Self-evolving playbook of lessons learned (`.fireskills/LESSONS.md`) |
| `fireskill-the-jury` | Multi-perspective deliberation for high-impact decisions |
| `fireskill-the-fool` | Adversarial stress-testing and pre-mortem analysis |
| `fireskill-the-judge` | Rigorous deterministic code review with evidence |
| `fireskill-aux-stack` | Maintains `.fireskills/STACK.md` |
| `fireskill-aux-rules` | Maintains `.fireskills/RULES.md` |
| `fireskill-aux-database` | Maintains `.fireskills/DATABASE.md` |

## Technical Specialists

Specialists are technical context skills equipping agents with deep expertise in a given area.

### Nuxfire Stack (Mandatory for project work)

| Specialist | Domain |
|---|---|
| `fireskill-specialist-nuxt` | Nuxt 4: pages, layers, middleware, composables, Nitro |
| `fireskill-specialist-nuxt-ui` | @nuxt/ui v4: 125+ components, themes, app.config.ts |
| `fireskill-specialist-trpc` | tRPC v10: procedures, routers, layer composition |
| `fireskill-specialist-drizzle` | Drizzle ORM: schema, relations, migrations, query builder |
| `fireskill-specialist-cloudflare-workers` | Workers, KV, R2, Queues, Durable Objects, Cron, Hyperdrive |
| `fireskill-specialist-sst` | SST 4: infrastructure as code, secrets, linking, deploy |
| `fireskill-specialist-openauth` | OpenAuth.js: providers, KV sessions, callbacks |
| `fireskill-specialist-nuxfire-layers` | Nuxfire domain layers architecture |
| `fireskill-specialist-nuxt-authorization` | RBAC: defineAbility, abilityProcedure, Can component |
| `fireskill-specialist-pinia` | Pinia: stores, SSR hydration, composables |
| `fireskill-specialist-billing` | Stripe and Paddle: checkout, webhooks, subscriptions, plans |
| `fireskill-specialist-content-seo` | Blog and docs content, translations and SEO: frontmatter contract, metadata builders, hreflang and sitemap, `check:seo` |
| `fireskill-specialist-web-performance` | Browser delivery: zero-JS routes, lazy hydration, images, fonts, Core Web Vitals, budgets, `check:perf` |
| `fireskill-specialist-seo` | Google and Bing requirements: status codes, redirects, canonical, sitemap, structured data, IndexNow, `check:seo --live` |
| `fireskill-specialist-copywriting` | Every human-readable text: research, messaging, application text, claim ledger, localisation, `check:copy` |

### Engineering (Stack-Agnostic)

| Specialist | Domain |
|---|---|
| `fireskill-specialist-typescript` | Strict TypeScript, end-to-end type safety |
| `fireskill-specialist-postgres` | PostgreSQL: modeling, SQL, indexes, migrations |
| `fireskill-specialist-tailwind-css` | Tailwind CSS: tokens, responsiveness, variants |
| `fireskill-specialist-software-architecture` | Architecture: boundaries, dependencies, ADRs |
| `fireskill-specialist-web-api-design` | APIs: contracts, error handling, pagination (tRPC) |
| `fireskill-specialist-application-security` | Security: OWASP, secrets, auth, webhooks |
| `fireskill-specialist-debugging` | Disciplined diagnostics of bugs and regressions |
| `fireskill-specialist-code-review` | Code review by contract, risk, and executable evidence |
| `fireskill-specialist-performance-engineering` | Performance: Web Vitals, Workers, profiling |
| `fireskill-specialist-observability` | Logs, traces, SLOs (Cloudflare Workers Logs/Traces) |
| `fireskill-specialist-data-modeling` | Data modeling: entities, relationships, Drizzle schema |
| `fireskill-specialist-domain-modeling` | Domain modeling: ubiquitous language, invariants |
| `fireskill-specialist-prototyping` | Spikes and prototypes to reduce technical uncertainty |
| `fireskill-specialist-technical-research` | Traceable technical research in primary sources |
| `fireskill-specialist-design-system` | Design system: @nuxt/ui tokens, SaaS patterns |
| `fireskill-specialist-ui-design` | SaaS UI: dashboards, tables, forms (Vue SFC) |
| `fireskill-specialist-ux-design` | UX: user flows, information architecture, research |
| `fireskill-specialist-interface-experience` | Interface experience: screens, forms, user journeys |
| `fireskill-specialist-web-accessibility` | Accessibility: WCAG, semantics, keyboard navigation |
| `fireskill-specialist-delivery-engineering` | Delivery: SST stages, Cloudflare deployments, rollbacks |
| `fireskill-specialist-versioning` | SemVer, release cadence, tags, deployment alignment |
| `fireskill-specialist-gitflow` | Branches: main/develop/feature/release/hotfix |
| `fireskill-specialist-merge-conflict-resolution` | Git merge conflict resolution |

## Context Files

`fireskill-setup` creates and maintains persistent project context in `.fireskills/`:

| File | Purpose |
|---|---|
| `.fireskills/PROJECT.md` | Product vision, goals, target audience |
| `.fireskills/INTERFACE.md` | Interface contracts (@nuxt/ui, visual patterns) |
| `.fireskills/DESIGNSYSTEM.MD` | Tokens, colors, typography, components |
| `.fireskills/STACK.md` | Full technical stack with file evidence |
| `.fireskills/RULES.md` | Mandatory project rules |
| `.fireskills/DATABASE.md` | Drizzle schema, tables, relations |
| `.fireskills/PACKAGES.md` | Installed packages inventory |

## Workflow Engine (`fireskill` CLI)

Source code lives in `fireskills/cli/`. Available commands from repository root:

| Command | Action |
|---|---|
| `bun run fireskill transition <id> <state>` | Moves spec across `draft`, `defined`, `planned`, `in-progress`, `review`, `completed`, updates `Status`, syncs milestones |
| `bun run fireskill effort <id> <1-10> --reason "…"` | Records estimated effort with rationale |
| `bun run fireskill progress [--json] [--watch]` | Summary of specs, tasks, and checklist items |
| `bun run fireskill milestones sync` | Reconstructs `specs.md` and milestone projections |
| `bun run fireskill migrate` | Migrates specs from legacy layout to state folders |
| `bun run fireskill test` | Executes `bun run test` (Vitest) |
| `bun run fireskill validate <id> [--strict]` | Spec linter (metadata, sections, BDD, tasks) |
| `bun run fireskill lesson add/list/status/prune` | Manages self-evolving lessons playbook (`.fireskills/LESSONS.md`) |
| `bun run fireskill config show\|set` | Manages CLI configuration |

CLI test suite: `bun run test` inside `fireskills/cli/`.

## Agent Entry Point

All agent workflows start from `AGENTS.md` at the **repository root**, which instructs agents to read `fireskills/SKILL.md`, audit project context, and load relevant technical specialists before modifying code.
