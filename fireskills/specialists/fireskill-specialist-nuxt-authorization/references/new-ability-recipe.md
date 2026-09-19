# Recipe: Adding a Permission / Ability

Based on `layers/kanban` (feature layer permissions and abilities) and `layers/teams` (the three system role functions).

## Steps (in an existing layer)

1. **Permission string** — `layer:resource:action`. Add to:
   - `permissions` array in `layer.manifest.ts`;
   - Constants object in `shared/utils/permissions.ts` (`PERMISSIONS` / `<LAYER>_PERMISSIONS`).
2. **Ability** — in `shared/utils/abilities.ts`, **with layer prefix**:

```ts
export const myLayerCreateThing = defineAbility(
  (user: User | null, teamId: string) =>
    hasTeamPermission(user, teamId, MY_PERMISSIONS.THINGS.CREATE),
);
```

3. **Roles** — assign who receives the permission:
   - **Core** layer (`teams`/`billing`…): add to `SYSTEM_ROLES` in
     `apps/functions/src/database/seed/data.ts` (mirrored string constant).
   - **Feature** layer or new permission in an existing seeded database: implement
     `ensure<Layer>Permissions()` in `server/utils/permissions.ts` (following
     `ensureKanbanPermissions`), called at the beginning of layer procedures (e.g., `listBoards`).
     It must be **idempotent** (`onConflictDoNothing`) with an in-memory process flag.
   - If both, keep `data.ts` and `ensure…` **coherent**: they are two paths to the same state.
4. **Server** — inside the procedure (`abilityProcedure`):
   `await authorize(myLayerCreateThing, team.id)` **after** proving team membership
   and **before** writing data.
5. **Client** — `<Can :ability="myLayerCreateThing" :args="[team.id]">` to conditionally
   render UI, and/or a `useXAbility(team)` composable using `allows` in `useAsyncData`,
   located in `app/composables/use-ability.ts` **in the owning layer**.
6. **Test** — `shared/utils/abilities.test.ts`: test allowed, denied (no permission),
   outsider (different team), and self-action restrictions where applicable.
7. Run `bun run test` and `apps/app` typechecks.

## Checklist

- [ ] Ability export named with **layer** prefix (not permission name).
- [ ] `hasTeamPermission` is local; only constants imported across layers.
- [ ] Manifest, constants, and `SYSTEM_ROLES` share the **exact same** string.
- [ ] System roles receive the permission (seed **and/or** `ensure…`).
- [ ] `authorize` called on server; `<Can>` is purely for UX.
- [ ] Imported via `@nuxfire/layer-<name>/shared/utils/abilities` outside the layer.
- [ ] Tests cover allowed, denied, and outsider cases.
- [ ] Platform admin procedures do not use `abilityProcedure`.
