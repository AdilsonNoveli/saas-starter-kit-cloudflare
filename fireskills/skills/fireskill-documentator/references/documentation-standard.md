# Technical Documentation Standard

- Source: Specsfy framework documentation architecture.
- Verified on: 2026-07-27.
- Adaptation: deterministic topology for Node (Nuxt/Bun) projects, without replacing executable code or human writing.

## Topology

| File | Responsibility |
| --- | --- |
| `docs/README.md` | Portal, scope, and recommended reading order |
| `docs/architecture.md` | Boundaries, components, dependencies, and UML diagrams |
| `docs/application.md` | Modules and existing codebase implementations |
| `docs/database.md` | Data sources, entities, fields, relationships, and ER diagrams |
| `docs/flows.md` | Routes, user journeys, and sequence diagrams |
| `docs/testing.md` | Runners, commands, test inventories, and execution summary |
| `docs/frontend.md` | Pages, Vue components, `@nuxt/ui`, and Tailwind styling |
| `docs/packages.md` | Runtimes, frameworks, and third-party dependencies |
| `docs/integrations.md` | External services and secure configurations |
| `docs/decisions.md` | Explicit architectural decisions and provenance |
| `.fireskills/PACKAGES.md` | npm/Bun inventory with version, purpose, and repository source |

## Rules

- Use relative repository paths as evidence links.
- Render valid Mermaid syntax inside `mermaid` code fences.
- Distinguish verified observations from inferences and unidentified gaps.
- Preserve human writing outside generated marker blocks.
- Never publish environment secrets, credentials, or production datasets.
- Inventory direct and transitive dependencies found across all `package.json` and `bun.lock` files in the project, excluding generated directories (`node_modules/`, `.nuxt/`, `.output/`, `dist/`).
- Utilize local package descriptions; when missing, report the gap without fabricating purposes.
- Maintain deterministic output for identical codebase inputs.
