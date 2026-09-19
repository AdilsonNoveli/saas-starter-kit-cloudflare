# Publishable Framework Guidelines

- Derived from the `specsfy:framework` block of monorepo `promovaweb/specsfy`.
- Adaptation: shortened block for Nuxfire; full contract remains in `{{SPECSFY_SPEC_PATH}}`, read only when a workflow skill executes.

<!-- specsfy:framework:start -->
## Fireskills Framework

Workflow, directories, and gates: `{{SPECSFY_SPEC_PATH}}` (read when running any workflow skill).
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
