# Recipe: Adding a tRPC Router to a Layer

Based on `layers/kanban/server/trpc/router.ts` (the canonical feature layer)
and `layers/teams/server/trpc/router.ts` (a layer exposing multiple router keys).
Confirm each path against actual code before copying: the codebase supersedes this document.

## Steps

1. **Abilities First** (if actions depend on team permissions): define in
   `layers/<layer>/shared/utils/abilities.ts` — see `$fireskill-specialist-nuxt-authorization`.
2. **Database Tables** (if applicable): `layers/<layer>/server/database/schema.ts` — see
   `$fireskill-specialist-drizzle`.
3. **Router Definition** in `layers/<layer>/server/trpc/router.ts` (or multiple sub-routers
   aggregated into it, as in `teams`):

```ts
import { TRPCError, type AnyRouter } from "@trpc/server";
import { z } from "zod";
import { abilityProcedure, router } from "~~/server/trpc/trpc";
import { useDB } from "~~/server/utils/db";
import { myAbility } from "../../shared/utils/abilities";

const myRouter = router({
  list: abilityProcedure
    .input(z.object({ teamIdentifier: z.string() }))
    .query(async ({ ctx: { authorize, user }, input }) => {
      // 1) verify that the team exists and that `user` belongs to it
      // 2) only then authorize the action for that team
      await authorize(myAbility, /* team.id */);
      return useDB().query.myTable.findMany(/* ... */);
    }),
});

export const routers = {
  myKey: myRouter,
} satisfies Record<string, AnyRouter>;
```

4. **Export the `routers` Map** with this exact identifier: `scripts/compose-layers.ts`
   statically imports it by name (does not guess from manifest).
5. **Enable the Layer** in `config.ts` (`layers.core` or `layers.features`). When
   starting Nuxt, `.composition/layer-routers.ts` regenerates automatically — verify
   the diff, but do not edit manually.
6. **Frontend Consumption**: `useTrpcClient().myKey.list.useQuery({ ... })`.
7. **Derived Types**: `RouterOutput["myKey"]["list"]`.

## Pre-Completion Checklist

- [ ] Procedure uses the appropriate base (`public` / `protected` / `ability` / `platformAdmin`);
      no platform concerns outside `admin.*`.
- [ ] `.input()` validated via `zod` with contextual error messages.
- [ ] Every client-provided ID is resolved in the **database** and crossed against the user's
      active team before taking action (card → column → board → team).
- [ ] `authorize` invoked prior to any mutation or write.
- [ ] Errors throw `TRPCError` with standard `code`, never unhandled generic errors.
- [ ] `export const routers = {...} satisfies Record<string, AnyRouter>` (using `satisfies`,
      never widening type annotations).
- [ ] No imports from other layers without explicit declarations in the layer's
      `package.json` (`@nuxfire/layer-*`).
- [ ] If procedures consume `ctx.jobsQueue`/`Websockets`, handle cases where feature flags
      are disabled.
- [ ] `bun run typecheck` in `apps/app` and layer tests (`vitest`) pass cleanly.
