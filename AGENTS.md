# Nuxfire — Agent Instructions

Development in this repository is governed by **Fireskills** (`fireskills/`):
a specification-driven workflow and 38 technical specialists with verified knowledge
of this codebase. Never work from memory: work through the framework.

## Always Start Here

1. Read `fireskills/SKILL.md`. It identifies which workflow skill and technical specialist
   to activate for the request.
2. Read `.fireskills/RULES.md` (project rules) and, for the subject at hand,
   `.fireskills/PROJECT.md`, `STACK.md`, `DATABASE.md`, `INTERFACE.md`, or
   `DESIGNSYSTEM.MD`.
3. Load the domain technical specialist **before** reading or modifying code
   (`fireskills/specialists/`; routing table is in `fireskills/SKILL.md`).

## Core Working Rules

- **Every human-readable text in the apps** (interface labels and buttons, empty states, errors and
  permission messages, landing and pricing copy, blog voice, transactional emails, notifications, docs, legal
  text, testimonials and any claim about the product; not the names of menus, tools and features) passes through
  `fireskill-specialist-copywriting`; no number, comparison, guarantee, deadline or testimonial is
  written without a record in `.fireskills/CLAIMS.yml`. Page weight belongs to
  `fireskill-specialist-web-performance` and what search engines require to `fireskill-specialist-seo`.
- Behavioral changes (features, business rules, data schemas, views): strictly follow workflow in
  `fireskills/skills/`. Trivial fixes: may proceed directly, provided `.fireskills/RULES.md` has been read
  and the relevant specialist is loaded.
- Working code supersedes any documentation. Every claim about the project requires
  concrete file evidence.
- No deployments, destructive data operations, or irreversible actions without explicit user authorization.
- Never declare work "done" without running full validation: `bun run test`, typechecks
  (`apps/app` and `bunx vue-tsc --noEmit -p server/tsconfig.json`), and checks specified by the specialist.
  For content and page metadata (`apps/web`), also `bun run check:seo` against a fresh `nuxt build`;
  for anything that changes what a public page weighs, `bun run check:perf`; for any text a human
  reads, `bun run check:copy` and `bun run check:i18n`.

<!-- specsfy:framework:start -->
## Fireskills Framework

Workflow, directories, and gates: `fireskills/skills/Spec.md` (read when running any workflow skill).
Project context: `.fireskills/` (`PROJECT`, `STACK`, `RULES`, `DATABASE`, `PACKAGES`,
`INTERFACE`, `DESIGNSYSTEM`, `USER-PROFILE`).

- Before executing a workflow skill, run `$fireskill-setup`; run the context monitor at the beginning,
  after each task, and before finishing, resolving any `PENDING` flags.
- Do not repeat questions already answered in `.fireskills/USER-PROFILE.md`.
- Specs: `specs/inbox/`, `specs/backlog/`, and `specs/<state>/<NNNN>-<slug>/spec.md` as the
  sole canonical source of truth (no `plan.md`, `tasks.md`, or `research.md`).
- Tasks that alter persistent database schemas must include `[MIGRATION]`: versioned migrations (drizzle-kit),
  applied during deployment, never on the development database.
- After every implementation slice, execute `$fireskill-documentator`.
<!-- specsfy:framework:end -->
