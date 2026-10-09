---
name: fireskill-specialist-nuxt-authorization
description: Define and review team-based RBAC (multi-tenant) in Nuxfire with `nuxt-authorization` — `defineAbility()` in `layers/*/shared/utils/abilities.ts`, `PERMISSIONS` constants, Owner/Admin/Member system roles, `abilityProcedure` (`authorize`/`allows`/`denies`), `<Can>` and `allows()` on the client. Use when adding or modifying permissions, abilities, roles, or any "can do X in this team" check; platform authority (`platformAdminProcedure`, elevated MFA) is a separate system and is not covered here.
---

# nuxt-authorization (Team RBAC)

## When to Use

- Trigger when creating or modifying permissions, abilities (`defineAbility`), system
  roles, `authorize`/`allows` checks in a procedure, or `<Can>`/`allows()` on the client.
- Trigger when debugging "ability not found", collisions between layers, unexpected
  access denials, or new permissions missing in existing deployments.
- Do not trigger for **platform** access (`/admin`): see `platformAdminProcedure` in
  `$fireskill-specialist-trpc`. Do not trigger for authentication or session lifecycle:
  use `$fireskill-specialist-openauth`.
- Combine with `$fireskill-specialist-nuxfire-layers` (layer naming and structure),
  `$fireskill-specialist-trpc` (where `authorize` runs), `$fireskill-specialist-drizzle`
  (`Role`/`Permission` tables), and `$fireskill-specialist-application-security`.

## Workflow

1. Read [references/nuxfire-authorization.md](references/nuxfire-authorization.md).
2. For a new permission or ability, follow [references/new-ability-recipe.md](references/new-ability-recipe.md).
3. Find an existing ability in `layers/teams`, `layers/billing`, or `layers/kanban`
   and mirror the pattern (not from memory).
4. Ensure the three sources of truth align: layer manifest, permission constants,
   and system roles (`SYSTEM_ROLES` / `ensure…`).
5. Validate with ability unit tests and manual server authorization checks.

## Core Rules

- **Every ability export MUST carry the layer prefix** (e.g., `kanbanCreateBoard`),
  never the permission name; without a prefix, Nuxt auto-imports collide silently.
- Procedures are **not** prefixed (e.g., `teams.listMembersAndInvites`): only abilities.
- `hasTeamPermission` is copied in each layer; import only permission **constants**
  from other layers.
- Abilities targeting a resource inspect the target (e.g., denying action on oneself in
  `teamsUpdateMemberRole`/`teamsRemoveMember`).
- Server: verify team membership first, **then** call `authorize`, **before** mutations.
  Abilities do not check resource existence or team membership.
- `<Can>` and `allows()` on the client only control UI visibility; **the server is the source of protection**.
- Imports outside the layer: `@nuxfire/layer-<name>/shared/utils/abilities`; never `#shared/…`.
- The `layer:resource:action` string must match across manifest, constants, `SYSTEM_ROLES`,
  and `Permission` table rows; renaming a string orphans real data.
- System roles have `Role.teamId = null`. Adding a permission to existing seeded databases
  requires an idempotent `ensure<Layer>Permissions()`.
- Client wrapper composable (`useXAbility`) resides in the layer defining the ability.
- Permissions come from the loaded session; database updates take effect when the session reloads.
- Renaming or moving abilities: **do not alter test assertions**, only identifiers.
- Platform administration never passes through `abilityProcedure` (and vice-versa).

## Antipatterns

- Ability without layer prefix; prefixing procedure names.
- Relying solely on `<Can>` to secure an operation.
- Calling `authorize` without first verifying team existence and membership.
- Importing `hasTeamPermission` across layer boundaries.
- Adding a permission only in the manifest (or code) without assigning to roles.
- Renaming persisted permission strings.
- Using `#shared/utils/abilities` across layers.
- Placing `useXAbility` in the consuming layer rather than the owning layer.
- Deriving platform admin authority from team permissions.
- Assuming CASL or hardcoded static permissions.
- Changing ability behavior while moving or renaming it.

## Validation

- `bun run test` (Vitest): layer `abilities.test.ts` with allowed, denied, outsider,
  and self-action cases.
- Seeded database check: new permission exists for expected system roles (`SELECT` in `Permission`)
  and `ensure…` runs idempotently.
- Call procedure without permission → `FORBIDDEN` and `authz denied` logged; call with
  user from another team → denied.
- Client UI: element inside `<Can>` disappears without permission; direct API call
  still returns `FORBIDDEN`.
- `bun run --cwd apps/app typecheck`.
