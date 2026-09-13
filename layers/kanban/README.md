# `@nuxfire/layer-kanban`

Pilot Nuxt 4 feature layer (Fase 2 of `_docs/REFATORE_ARCHITETURE.md`): visual
task management — boards, columns, cards, drag-and-drop — scoped to a team.

## Activation

Toggled from the root `config.ts`:

```typescript
export const layers = {
  core: [],
  features: { kanban: true },
};
```

`packages/app/nuxt.config.ts` turns that into `extends: ["@nuxfire/layer-kanban"]`.
Setting it to `false` drops this layer's pages, components and `nuxt.config.ts`
from the build entirely.

What `false` does **not** do:

- it does not drop the tables. `packages/functions/src/database/schema.ts`
  re-exports `server/database/schema.ts` unconditionally, so the Drizzle client
  stays typed and existing rows stay put. Disabling means "out of the UI", never
  "erased" (plan §4, "dado órfão").
- it does not drop the tRPC router. `scripts/compose-layers.ts` discovers layers
  from disk, not from the flags, so `kanbanRouter` stays mounted on `appRouter`.

## Layout

| Path                           | Role                                                                            |
| ------------------------------ | ------------------------------------------------------------------------------- |
| `layer.manifest.ts`            | identity, `requires`, sidebar navigation, permission catalogue                  |
| `nuxt.config.ts`               | `$meta.name` (gives `#layers/kanban`) + the mandatory `Kanban` component prefix |
| `app/components/Kanban*.vue`   | board / column / card UI, globally registered under the prefix                  |
| `app/composables/useKanban.ts` | this layer's slice of the tRPC client                                           |
| `app/pages/[[team]]/kanban/`   | `index.vue` (board list), `[boardId].vue` (single board)                        |
| `server/trpc/router.ts`        | exports `kanbanRouter` — the name `compose-layers.ts` generates an import for   |
| `server/database/schema.ts`    | `KanbanBoard`, `KanbanColumn`, `KanbanCard`                                     |
| `shared/utils/permissions.ts`  | `KANBAN_PERMISSIONS`, mirroring the manifest strings                            |
| `shared/utils/abilities.ts`    | `defineAbility()` calls, **every name prefixed `kanban*`**                      |

## Conventions that are not optional

- **Ability names are prefixed** (`kanbanCreateBoard`, never `createBoard`).
  `nuxt-authorization` relies on Nuxt's cross-layer auto-import of
  `shared/utils/`, which is one flat namespace — an unprefixed name collides
  with another layer silently, with no build error (plan §5).
- **Components are prefixed** (`<KanbanBoard>`), enforced by `nuxt.config.ts`.
- **`server/database/schema.ts` imports `@nuxfire/functions/database/core-schema`,
  never `@nuxfire/functions/schema`** — the barrel re-exports this file, so
  importing it back would be circular.
- **Backend crosses package boundaries by explicit import** (`~~/server/trpc/trpc`,
  `~~/server/utils/db`), not by Nitro's `server/` merge.

## Tests

`shared/utils/abilities.test.ts` runs under the root aggregator
(`vitest.config.mts` → `test.projects: ["packages/app", "layers/*"]`):

```bash
bun run test            # from the repo root
```
