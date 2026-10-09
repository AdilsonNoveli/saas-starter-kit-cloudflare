import type { AnyRouter } from "@trpc/server";
import { teamsRouter } from "./teams";
import { invitesRouter } from "./invites";

/**
 * This layer's contribution to `appRouter`, keyed by the top-level name each
 * router is mounted under.
 *
 * Two keys, not one: `teams` and `invites` are separate top-level namespaces in
 * the live API (`trpc.invites.acceptInvite.mutate()`, not
 * `trpc.teams.invites.*`). Extracting the domain into a layer must not reshape
 * the client-facing surface, so the map convention exists precisely to let one
 * layer own more than one key — it is why every layer, kanban included, exports
 * `routers` instead of a single `<name>Router` binding.
 *
 * `satisfies`, never a `: Record<string, AnyRouter>` annotation: the annotation
 * would widen the procedures away and every `trpc.teams.*` / `trpc.invites.*`
 * call would lose its input and output types on the client, since `AppRouter`
 * is inferred straight through this object. `satisfies` keeps the literal type
 * and still makes `tsc` reject a wrong shape here rather than at Nuxt build
 * time.
 */
export const routers = {
  teams: teamsRouter,
  invites: invitesRouter,
} satisfies Record<string, AnyRouter>;
