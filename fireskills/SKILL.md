---
name: fireskills
description: Specification-driven methodology of Nuxfire (Nuxt 4 + @nuxt/ui + tRPC + Drizzle + Cloudflare Workers + SST). Use upon receiving any engineering or product request in this repository — capture, refinement, specification, validation, tasks, TDD/BDD, implementation, documentation — to route to the correct workflow skill and technical specialists.
---

# Fireskills

System entry point. It does not execute slices directly: it routes to the appropriate workflow skill and technical specialists providing deep domain context on Nuxfire. Canonical contract: [`skills/Spec.md`](skills/Spec.md). Agent governance: `AGENTS.md` (repository root). Overview: [`README.md`](README.md).

## Workflow

`inbox → backlog → spec → validate → tasks → TDD/BDD → implement → documentator → progress`, across three acts (Define, Design/Prove, Deliver) with three quality gates (Definition, Plan, Delivery).

| Situation | Skill |
|---|---|
| New request, raw thought | `fireskill-01-inbox` |
| Refine backlog item and decisions | `fireskill-02-backlog` |
| Author canonical specification | `fireskill-03-specify` |
| Prove specification definition | `fireskill-04-validate` |
| Break down into executable tasks | `fireskill-05-tasks` |
| BDD-informed TDD tests | `fireskill-06-tdd-bdd` |
| Implement (RED → GREEN → REFACTOR) | `fireskill-07-implement` |
| Prepare project context | `fireskill-setup` |
| Late specification change | `fireskill-update-spec` |
| Rebuild `docs/` inventory | `fireskill-documentator` |
| Inspect workflow progress | `fireskill-progress` |
| Interactive specification interview | `fireskill-interviewer` |
| Define MVP or roadmap evolution | `fireskill-mvp-milestone-interviewer`, `fireskill-roadmap-milestone-interviewer`, `fireskill-milestone-governor` |
| Discover domain data model | `fireskill-data-discovery` |
| Record or query lessons learned | `fireskill-lessons` |
| Collegiate deliberation / high-impact decision | `fireskill-the-jury` |
| Adversarial stress-testing of assumptions | `fireskill-the-fool` |
| Evidence-grounded pull request review | `fireskill-the-judge` |
| Maintain STACK/RULES/DATABASE | `fireskill-aux-stack`, `fireskill-aux-rules`, `fireskill-aux-database` |
| Transition state, effort, validation | `bun run fireskill <command>` (see `README.md`) |

## Nuxfire Specialists

Load **before** writing code in each area:

| When touching | Load |
|---|---|
| `.vue`, `U*` components, theme, forms, tables | `fireskill-specialist-nuxt-ui` |
| pages, layouts, middleware, plugins, Nitro, `runtimeConfig` | `fireskill-specialist-nuxt` |
| `layers/`, `config.ts`, `layer.manifest.ts` | `fireskill-specialist-nuxfire-layers` |
| routers and procedures, `useTrpcClient()` | `fireskill-specialist-trpc` |
| schema, migrations, seed, queries | `fireskill-specialist-drizzle` (+ `-postgres`) |
| permissions, `defineAbility`, `<Can>` | `fireskill-specialist-nuxt-authorization` |
| login, sessions, cookies, `apps/functions/src/auth.ts` | `fireskill-specialist-openauth` |
| stores | `fireskill-specialist-pinia` |
| `layers/billing`, Stripe, Paddle, webhooks, plans, subscriptions | `fireskill-specialist-billing` |
| `apps/web/content/**`, blog posts, docs pages, translations, page metadata, sitemap, `apps/web/public/images/**` | `fireskill-specialist-content-seo` |
| every text a human reads: `apps/*/i18n/locales/**`, `.vue` template text, `packages/emails/templates/**`, pricing, testimonials, claims | `fireskill-specialist-copywriting` |
| `perf-budgets.json`, `routeRules` (`noScripts`), hydration, images, fonts, third-party scripts, bundle size, Core Web Vitals | `fireskill-specialist-web-performance` |
| `robots`, `apps/web/public/_redirects`, sitemap, canonical, structured data, `assets.htmlHandling`, IndexNow | `fireskill-specialist-seo` |
| Workers, bindings, queues, cron, Durable Objects | `fireskill-specialist-cloudflare-workers` |
| `infra/`, secrets, stages, deployment | `fireskill-specialist-sst` |

Stack-agnostic engineering specialists (security, accessibility, performance, observability, architecture, UX/UI, TypeScript, Postgres, Tailwind, review, debugging…) are documented in [`specialists/`](specialists/) and cataloged in `specialists/catalog.json`.

## Core Rules

1. **Code supersedes documentation.** Read the file before making claims.
2. Specialists describe "what actually exists" and "what DOES NOT exist" (see each `references/nuxfire-*.md`); never assume items from the second list exist.
3. Passing `tsc`, `vitest`, and `nuxt build` **does not** prove `sst deploy` works; for `apps/functions`/`layers`, deployment is the actual verification gate.
4. Specialists guide technical standards and validation; they do not author specs or bypass quality gates.
5. Irreversible or external actions (deployments, data deletion, publishing) require explicit user authorization.

## Sources of Truth (In conflict, higher item wins)

1. Working code and automated test suites.
2. `.fireskills/*` (`PROJECT`, `STACK`, `RULES`, `DATABASE`, `INTERFACE`, `DESIGNSYSTEM`), cross-checked against code.
3. Specialist references in `references/nuxfire-*.md`.

## Common Commands

| Purpose | Command (repository root) |
|---|---|
| Automated tests | `bun run test` |
| Typecheck | `bun run typecheck` in `apps/app` **and** `bunx vue-tsc --noEmit -p server/tsconfig.json` |
| i18n completeness | `bun run check:i18n` |
| SEO gate (frontmatter lint always; page audit after a build) | `SITE_URL=https://<domain> bun run --cwd apps/web build`, then `bun run check:seo` |
| Page weight gate (after a build) | `bun run check:perf` |
| Copy gate: claims, testimonials, urgency, literal text | `bun run check:copy` |
| Live SEO audit of a running server | `bun run check:seo -- --live <origin> [--sitemap-origin <origin>]` |
| IndexNow (dry run by default; `--submit` needs authorization) | `bun run indexnow -- --origin https://<domain>` |
| Social images (SVG covers to 1200x675 PNG) | `bun run generate:og` |
| Specs: progress, state transitions, effort, milestones | `bun run fireskill progress`, `transition <id> <state>`, `effort <id> <1-10> --reason "…"`, `milestones sync` |
| Deterministic spec linter | `bun run fireskill validate <id> [--strict]` |
| Lessons learned | `bun run fireskill lesson add/list/status/prune` |
| Context monitor | `node fireskills/skills/fireskill-setup/scripts/monitor_context.mjs --project . --check` |
| Database safety check | `node fireskills/skills/fireskill-setup/scripts/check_database_safety.mjs --project . --command "<command>"` |
| Deploy preflight (read-only checks) | `bun run doctor [-- --stage <stage>]` |
| Deploy (**only with authorization**) | `bun run deploy -- --stage <stage>` (runs the preflight first) |

## Keeping Fireskills Alive

- After completing an implementation slice: run `fireskill-documentator` and ensure context monitor has no `PENDING` flags.
- When business rules, screens, or database tables change: update `.fireskills/RULES.md`, `INTERFACE.md`, or `DATABASE.md` (auxiliary skills `fireskill-aux-*` update without erasing human notes).
- When public docs change (`apps/web/content/docs/2.fireskills`): keep translations in `content/pt-br/` and `content/es/` in sync; `bun run check:i18n` verifies completeness.
- Outdated or incorrect specialist: patch its `references/nuxfire-*.md` with concrete file evidence in the same commit.
