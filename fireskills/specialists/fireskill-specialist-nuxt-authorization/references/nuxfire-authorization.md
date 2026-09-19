# Authorization in Nuxfire — What Actually Exists in Code

Every statement cites its evidence file. Code supersedes this document.
There are **two distinct systems**; never confuse them:

| System | Question | Where |
|---|---|---|
| **Team RBAC (tenant)** | "can this user do X **in this team**?" | `nuxt-authorization` + `defineAbility()` + `abilityProcedure` |
| **Platform Authority** | "is this the SaaS owner/operator?" | `platformAdminProcedure` + `PlatformAdmin` + elevated MFA |

This document covers the first. The second is documented in `$fireskill-specialist-trpc`
(§3) and `$fireskill-specialist-openauth`.

## 1. Stack

- `nuxt-authorization` `^0.3.5` (`apps/app/package.json`), module in
  `apps/app/nuxt.config.ts`. Bouncer style: `defineAbility(fn)`.
- **CASL is not used.** User permissions come from database rows
  (`Role`/`Permission`), not hardcoded in source code.

## 2. Data Model

- `Role`: role per team; `Role.teamId = null` = **system role** (shared across teams).
  Three system roles: **Owner**, **Admin**, **Member** (`Member` is `isDefault`).
  `Permission`: `(action, roleId)` composite primary key (`onConflictDoNothing()` enables
  idempotent backfills); `action` is the string `layer:resource:action`.
- Source of truth: `apps/functions/src/database/seed/data.ts` (`SYSTEM_ROLES`),
  used by deployment seed **and** by `ensureSystemRoles()`
  (`layers/teams/server/utils/roles.ts`), the reactive safety net.
- `data.ts` **mirrors as literal strings** the actions from
  `layers/teams/shared/utils/permissions.ts` (the `functions` package does not depend
  on layer `shared/`). When one side changes, both must be updated.
- Feature layers created after initial seed add their own backfill:
  `ensure<Layer>Permissions()` (`layers/kanban/server/utils/permissions.ts`):
  role→permissions map, in-process boolean flag to pay one `SELECT` per process,
  `onConflictDoNothing()`.

## 3. How Users Reach Authorization Checks

- **Server**: `apps/app/server/plugins/authorization-resolver.ts` sets
  `event.context.$authorization.resolveServerUser = () => getUser(event)` per request.
  `getUser` (`server/utils/auth.ts`) returns `{ id, name, email, image, permissions, teams, isPlatformAdmin, mfaEnabled }`,
  where `permissions: Record<teamId, string[]>` and `teams: string[]` (`getUserPermissions`).
- **Client**: `apps/app/app/plugins/authorization-resolver.ts` →
  `resolveClientUser = () => useSession().user.value`.
- **Consequence**: permissions are sourced **from the loaded session**. Database changes
  take effect only after the session is reloaded.

## 4. Writing an Ability (Actual Convention)

File: `layers/<layer>/shared/utils/abilities.ts`.

```ts
import { PERMISSIONS } from "./permissions";

interface User {
  id: string;
  teams?: string[];
  permissions?: Record<string, string[]>;
}

const hasTeamPermission = (user: User | null, teamId: string, permission: string) =>
  !!user?.teams?.includes(teamId) &&
  (user?.permissions?.[teamId] || []).includes(permission);

export const teamsDeleteTeam = defineAbility(
  (user: User | null, teamId: string) =>
    hasTeamPermission(user, teamId, PERMISSIONS.TEAMS.DELETE),
);
```

- **Every exported name MUST carry the layer prefix** (`teamsDeleteTeam`,
  `kanbanCreateBoard`, `billingGetBillingInfo`). `nuxt-authorization` leverages Nuxt
  `shared/utils/` auto-imports across layers in a single namespace per export name:
  two `createBoard` exports collide silently without build errors. **The prefix is
  the owning LAYER, not the permission name**: `billingGetBillingInfo` checks
  `teams:billing:view` (which belongs to `teams`).
- **`hasTeamPermission` is intentionally duplicated** in each layer (four lines of pure
  predicate logic) so feature layers can build without a hard dependency on `teams`;
  importing across layers couples internals. Import only permission **constants**
  when needed (`@nuxfire/layer-teams/shared/utils/permissions`).
- `PERMISSIONS` / `KANBAN_PERMISSIONS` mirror the `permissions` array in `layer.manifest.ts`.
- Actions depending on a **target** inspect arguments:
  `teamsUpdateMemberRole(user, teamId, memberId?)` and `teamsRemoveMember` **deny acting
  on oneself** (`memberId !== user.id`).
- `teamsListTeams` returns `() => true`; `teamsGetTeamDetails` requires only team membership.
- Structural resources (e.g., board columns) inherit the permission of the **parent**
  (`kanbanUpdateBoard`), rather than having dedicated permissions.
- Imports outside the layer: `@nuxfire/layer-<name>/shared/utils/abilities`.
  **Never `#shared/utils/abilities`**: `#shared` resolves to the Composition Root, never a layer.

## 5. Server Usage (tRPC)

`abilityProcedure` (`apps/app/server/trpc/trpc.ts`) decorates `ctx`:

- `await ctx.authorize(ability, ...args)` — throws `TRPCError FORBIDDEN` (original error
  message) and logs `console.warn("authz denied", { userId, ability, args })`;
- `await ctx.allows(ability, ...args)` / `ctx.denies(...)` — boolean checks without throwing.

Procedure pattern: first verify team existence and user membership (query with `memberships`),
**then** invoke `authorize`. Abilities answer "can user do X in team T", never "T exists"
or "user belongs to T" — see `$fireskill-specialist-trpc`.

## 6. Client Usage

- **Conditional Rendering**: `<Can :ability="..." :args="[...]">` component
  (e.g., `layers/teams/app/pages/[[team]]/settings/members.vue`:
  `<Can :ability="sendInviteAbility" :args="[team?.id || '']">`), importing the ability as
  `import { teamsSendInvite as sendInviteAbility } from "@nuxfire/layer-teams/shared/utils/abilities"`.
  `<Can>` controls UI presentation only; **it provides zero security**: the server makes
  the authoritative decision.
- **Logic**: `allows(ability, ...args)` inside `useAsyncData`
  (`layers/teams/app/composables/use-ability.ts`):
  `useAsyncData(() => allows(teamsDeleteTeam, team.value), { watch: [team] })`.
- Client wrappers **belong to the layer defining the ability, not the consumer**:
  `useGetBillingInfoAbility` resides in `layers/billing/app/composables/use-ability.ts`
  even though used in `layers/teams` (`use-team-settings-links.ts` to show/hide Billing tab).

## 7. Testing

- `shared/utils/abilities.test.ts` per layer (teams, billing, kanban); import `allows`
  from `nuxt-authorization/utils`; mock users (`member([...permissions])`, `outsider`).
- `defineAbility` is auto-imported by Nuxt; layer `vitest.setup.ts` assigns it to
  `globalThis` (`Object.assign(globalThis, { defineAbility })`), intentionally duplicated
  for isolated layer test execution.
- When renaming or moving an ability, **do not modify test assertions**: only identifiers;
  green test suite proves intact behavior.

## 8. What Does NOT Exist

- Distinction between `SUPER_ADMIN` / `SUPPORT` platform roles (enum exists; procedure
  treats them identically).
- In-memory permission invalidation/caching beyond reloading session.
- End-to-end tRPC router integration tests covering `authorize`.
