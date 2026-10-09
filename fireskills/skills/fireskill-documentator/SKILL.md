---
name: fireskill-documentator
description: Build technical documentation in docs/ and the npm/Bun package inventory in .fireskills/PACKAGES.md. Use when documenting systems or following implementations.
---

# Document the System

## Mandatory Preparation

Before executing this skill, you must load `$fireskill-setup` at the project root.
On automatic handoff, reload it before this step.
Reuse the root confirmed in conversation and do not proceed if setup reports a pending blocker.

## Interaction Mode

Interaction mode: `no questions`.
Do not formulate questions in this skill. Document as unidentified any data not supported by executable sources.

1. Read local instructions, `.fireskills/PROJECT.md`, `.fireskills/STACK.md`,
   `.fireskills/RULES.md`, `.fireskills/DATABASE.md`, manifests, lockfiles,
   installed package metadata, and existing codebase.
2. Read [documentation standard](references/documentation-standard.md) before modifying published topology.
3. Build all documentation and `.fireskills/PACKAGES.md`, even when invoked without a recent spec or implementation:

   ```bash
   node scripts/build_documentation.mjs --project <root>
   ```

4. Inspect generated files and manually adjust only inferences that code does not support. Never fabricate decisions, relationships, or integrations.
5. Execute `--check` to verify documentation reflects current system state:

   ```bash
   node scripts/build_documentation.mjs --project <root> --check
   ```

6. Preserve human prose outside `specsfy:documentator` blocks, including in `.fireskills/PACKAGES.md`. Treat the block as a reproducible projection of local sources.
7. Record command, outcome, and modified files in task evidence.

## Mandatory Coverage

Maintain in `docs/`:

- Readme portal and reading roadmap;
- Architecture, components, and Mermaid UML diagrams;
- Application inventory and existing implementations;
- Database schemas and entities with `erDiagram`;
- Control flows with `flowchart` and `sequenceDiagram`;
- Testing guide and test suite summary;
- Frontend surfaces, pages, Vue components, `@nuxt/ui`, and Tailwind;
- Libraries and packages (native, framework, internal, third-party) with versions, sources, and GitHub links;
- Integrations and environment configuration variables without sensitive values;
- Explicit architectural decisions and their provenance.

Maintain in `.fireskills/PACKAGES.md`:

- All npm packages (Bun workspaces) found across project manifests and lockfiles, including locally recorded transitive dependencies;
- Package manager, scope, name, version, short purpose, and origin repository;
- Package description from lockfile or installed `package.json`;
- Explicit warning when local metadata lacks purpose description.

For Nuxfire (Nuxt/Vue), map pages, layouts, middleware, server routes (`server/api`), tRPC routers, layers (`layers/*`), Drizzle schemas and migrations, Workers (`apps/functions`), SST resources (`infra/*.ts`), scripts, and Vitest.

## Boundaries

- Do not copy secrets, `.env` values, production datasets, or whole code dumps.
- Do not present heuristics as confirmed decisions.
- Do not overwrite specs, `.fireskills/PROJECT.md`, or human notes in `.fireskills/`.
  `PACKAGES.md` is the sole projection rebuilt by this skill in that directory and preserves content outside generated blocks.
- Do not require network access to build. When a package repository is unknown or undeclared locally, output a clearly labeled GitHub search link rather than inventing URLs.
