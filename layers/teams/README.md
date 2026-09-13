# `@nuxfire/layer-teams`

Multi-tenancy: teams, memberships, invitations and the per-tenant RBAC
(`Role`/`Permission`) every other layer depends on. First of the four core-layer
extractions in Fase 3 of `_docs/REFATORE_ARCHITETURE.md`, and first on purpose —
`billing`, `notifications` and `admin` all reference it.

> **Status: backend only.** Fase 3 passo 1a moved the schema, the tRPC routers,
> the server utils and the RBAC abilities here. The Pinia store, the Vue
> components/pages and the route middleware are still in `packages/app/app/` and
> move in passo 1b. Until then `packages/app/shared/utils/abilities.ts` is a
> temporary re-export bridge so the app's `#shared/utils/abilities` specifier
> keeps resolving — delete it with the frontend move.

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

| Path                          | Role                                                                           |
| ----------------------------- | ------------------------------------------------------------------------------ |
| `layer.manifest.ts`           | identity, permission catalogue; no `navigation` (no top-level nav item)        |
| `nuxt.config.ts`              | `$meta.name` only — no `components` prefix until the frontend moves here       |
| `server/trpc/router.ts`       | exports `routers` = `{ teams, invites }`, the two top-level `appRouter` keys   |
| `server/trpc/teams.ts`        | `teamsRouter` — CRUD, membership, roles, logo                                  |
| `server/trpc/invites.ts`      | `invitesRouter` — send/accept/update/delete, seat enforcement                  |
| `server/database/schema.ts`   | `Team`, `TeamMembership`, `TeamInvite`, `Role`, `Permission` + their relations |
| `server/utils/roles.ts`       | `ensureSystemRoles()` — reactive Owner/Admin/Member safety net                 |
| `server/utils/team-seats.ts`  | seat counting and invite-expiry rules (+ its test)                             |
| `shared/utils/permissions.ts` | `PERMISSIONS`, the string constants abilities check against                    |
| `shared/utils/abilities.ts`   | `defineAbility()` calls (+ the 66-case test that guards this whole move)       |

## Conventions that are not optional

- **`server/trpc/router.ts` exports a `routers` map**, not a single
  `<name>Router` binding. This layer is why the convention exists: `teams` and
  `invites` are two separate top-level keys in the live API
  (`trpc.invites.acceptInvite`, not `trpc.teams.invites.*`), and extracting a
  domain must not reshape the client-facing surface. Written
  `satisfies Record<string, AnyRouter>` and **never annotated** as one — the
  annotation would widen every procedure away and strip the client of its types.
- **The tRPC routers cross package boundaries by explicit import**
  (`~~/server/trpc/trpc`, `~~/server/utils/db`, `~~/server/utils/plans`), like
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
- **Ability names here are the one unprefixed set in the repo.** Every other
  layer prefixes (`kanbanListBoards`); these predate the convention and renaming
  them has to land with their call sites. See the comment at the top of
  `shared/utils/abilities.ts`. Anything new added here takes the `teams*` prefix.
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
