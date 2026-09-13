# `@nuxfire/layer-teams`

Multi-tenancy: teams, memberships, invitations and the per-tenant RBAC
(`Role`/`Permission`) every other layer depends on. First of the four core-layer
extractions in Fase 3 of `_docs/REFATORE_ARCHITETURE.md`, and first on purpose —
`billing`, `notifications` and `admin` all reference it.

> **Status: complete.** Fase 3 passo 1a moved the schema, the tRPC routers, the
> server utils and the RBAC abilities here; passo 1b moved the Pinia stores, the
> composables, the Vue components and the pages, renamed every ability to the
> `teams*` convention and deleted the `packages/app/shared/utils/abilities.ts`
> re-export bridge (`packages/app/shared/` no longer exists).
>
> Two things stayed in the Composition Root on purpose, both documented below:
> `app/middleware/1.teams.global.ts` (global middleware ordering) and
> `app/layouts/dashboard.vue` (the app shell, which consumes this layer purely
> through cross-layer auto-import and needed zero edits).

## Activation

Core, not toggleable — registered in the root `config.ts`:

```typescript
export const layers = {
  core: ["teams"],
  features: { kanban: true },
};
```

`core` and `features` feed the same `activeLayerNames` set in
`packages/app/nuxt.config.ts`, so a core layer needs no hand-written import
anywhere: `extends`, the generated tRPC composition and the generated sidebar
navigation all pick it up from that one array.

## Layout

| Path                          | Role                                                                                                                        |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `layer.manifest.ts`           | identity, permission catalogue; no `navigation` (no top-level nav item)                                                     |
| `nuxt.config.ts`              | `$meta.name` + `components` prefix — **currently not loaded by Nuxt**, see below                                            |
| `app/composables/`            | `useTeamsStore`/`useCurrentTeam`, `useInviteStore`, the four ability wrappers, `useTeamSettingsLinks`                       |
| `app/components/`             | `Team*.vue`, flat — `TeamSwitcher`, `TeamSwitcherDropdown`, `TeamCreateModal`, `TeamMembersListItem`, `TeamInvitesListItem` |
| `app/pages/`                  | `select-team`, `invite/[[id]]`, and `[[team]]/settings` + its General/Members/Danger-Zone children                          |
| `app/middleware/invite.ts`    | named middleware for the invite-acceptance page                                                                             |
| `server/trpc/router.ts`       | exports `routers` = `{ teams, invites }`, the two top-level `appRouter` keys                                                |
| `server/trpc/teams.ts`        | `teamsRouter` — CRUD, membership, roles, logo                                                                               |
| `server/trpc/invites.ts`      | `invitesRouter` — send/accept/update/delete, seat enforcement                                                               |
| `server/database/schema.ts`   | `Team`, `TeamMembership`, `TeamInvite`, `Role`, `Permission` + their relations                                              |
| `server/utils/roles.ts`       | `ensureSystemRoles()` — reactive Owner/Admin/Member safety net                                                              |
| `server/utils/team-seats.ts`  | seat counting and invite-expiry rules (+ its test)                                                                          |
| `shared/utils/permissions.ts` | `PERMISSIONS`, the string constants abilities check against                                                                 |
| `shared/utils/abilities.ts`   | `defineAbility()` calls, all `teams*`-prefixed (+ the 66-case test that guards this whole move)                             |

## Conventions that are not optional

- **`server/trpc/router.ts` exports a `routers` map**, not a single
  `<name>Router` binding. This layer is why the convention exists: `teams` and
  `invites` are two separate top-level keys in the live API
  (`trpc.invites.acceptInvite`, not `trpc.teams.invites.*`), and extracting a
  domain must not reshape the client-facing surface. Written
  `satisfies Record<string, AnyRouter>` and **never annotated** as one — the
  annotation would widen every procedure away and strip the client of its types.
- **The tRPC routers cross package boundaries by explicit import**
  (`~~/server/trpc/trpc`, `~~/server/utils/db`) and reach peer layers by package
  specifier (`@nuxfire/layer-billing/server/utils/plans` since Fase 3 passo 2a,
  when `ensureFreePlan` moved with `Plan`), like
  `layers/kanban`'s does. They are imported as plain modules by the generated
  `.composition/layer-routers.ts`, outside any auto-import scope.
- **`server/utils/*.ts` deliberately do NOT do that.** They still call `useDB()`
  as a bare Nitro auto-import, exactly as they did inside `packages/app` —
  Nitro's scan covers every active layer's `server/` dir
  (`scanDirs: layerDirs.map((dirs) => dirs.server)`, `@nuxt/nitro-server`). They
  were relocated byte-for-byte on purpose: `team-seats.test.ts` stubs `useDB` on
  `globalThis`, and that net only proves the move changed nothing if the moved
  code is genuinely unchanged.
- **`server/database/schema.ts` and `packages/functions/src/database/core-schema.ts`
  import each other.** That cycle is real and deliberate: `Subscription`, `Job`
  and `DeadLetterRecord` stay in core holding FKs to `Team`, while
  `TeamMembership`/`TeamInvite` live here holding FKs to `User`. It is safe only
  because every cross-boundary reference sits inside a Drizzle callback
  (`.references(() => users.id)`, `relations(t, ({ one }) => ...)`) — nothing may
  read an imported binding at module top level, or the cycle becomes a TDZ crash
  at import time.
- **Every ability export is `teams*`-prefixed** (`teamsDeleteTeam`,
  `teamsSendInvite`, …), like every other layer's. These were the repo's one
  unprefixed set until passo 1b retrofitted them alongside their last call
  sites. The tRPC **procedure** keys are deliberately NOT prefixed
  (`teams.listMembersAndInvites`, `invites.sendInvite`) — that is the live
  client-facing API and extracting a domain must not reshape it, so a blind
  find-and-replace on an ability name is exactly the wrong tool here.
- **`#shared/utils/abilities` does not work from a layer.** `#shared` is aliased
  to the Composition Root's own `shared/` only. Import
  `@nuxfire/layer-teams/shared/utils/abilities` instead (that is what the
  deleted bridge existed to paper over).
- **`nuxt.config.ts` in this directory is not loaded by Nuxt today.** `extends`
  resolves `@nuxfire/layer-teams` through `package.json`'s `exports["."]`, which
  points at `layer.manifest.ts`, so c12 loads the manifest as the layer config.
  The `components` `prefix` therefore does nothing and `#layers/teams` is not a
  real alias — the `Team*` component namespace comes from the FILENAMES, exactly
  as `layers/kanban`'s `Kanban*.vue` always really worked. Keep new components
  named `Team*.vue`. Full detail in the comment at the bottom of that file.
- **`1.teams.global.ts` stays in `packages/app/app/middleware/`.** Nuxt runs
  every layer's global middleware BEFORE the Composition Root's, sorting by
  filename only within a single directory, so from here it would run before
  `0.auth.global.ts` — which silently rewrites the post-login redirect for any
  logged-out deep link into a team. `invite.ts` is named (not global) middleware
  and has no such constraint, which is why it does live here.
- **`Role.teamId = null` means a system role shared by every team**, not an
  unscoped row. Do not "fix" it into a NOT NULL column.

## Tests

Run under the root aggregator (`vitest.config.mts` →
`test.projects: ["packages/app", "layers/*"]`):

```bash
bun run test            # from the repo root
```

Typechecking is `bun run typecheck` in `packages/app`: Nuxt puts every active
layer's `server/**` and `shared/**` into the app's tsconfig program, so this
layer has no typecheck script of its own.
