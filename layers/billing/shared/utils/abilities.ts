// The permission STRING stays teams-owned, the ability FUNCTION lives here.
//
// `teams:billing:view` is written into live `Permission` rows and declared by
// `layers/teams`'s manifest, so renaming it would orphan existing data for no
// gain. What moved in Fase 3 passo 2a is the `defineAbility()` that reads it:
// it was `teamsGetBillingInfo` in `layers/teams/shared/utils/abilities.ts`,
// flagged there by passo 1b as "a billing ability that happens to live in
// abilities.ts ... it should migrate to layers/billing in the next extraction".
import { PERMISSIONS } from "@nuxfire/layer-teams/shared/utils/permissions";

// NAMING CONVENTION — read before adding anything here.
//
// Every ability name is prefixed with the layer name (`billingGetBillingInfo`,
// never `getBillingInfo`), exactly like `layers/teams`' `teamsDeleteTeam` and
// `layers/kanban`'s `kanbanListBoards`: `nuxt-authorization` piggybacks on
// Nuxt's cross-layer auto-import of `shared/utils/`, which is one flat
// namespace keyed by export name, so two layers exporting the same bare name
// collide silently with no build error. The prefix is the LAYER's, not the
// permission's — which is exactly why this export is `billing*` even though it
// gates a `teams:*` permission string.

interface User {
  id: string;
  teams?: string[];
  permissions?: Record<string, string[]>;
}

// Duplicated from layers/teams' abilities.ts rather than imported from it: it
// is four lines of pure predicate with no behaviour to keep in sync, and
// importing it would make this layer depend on the internals of another
// layer's ability module instead of just its permission constants.
const hasTeamPermission = (
  user: User | null,
  teamId: string,
  permission: string,
): boolean => {
  return (
    !!user?.teams?.includes(teamId) &&
    (user?.permissions?.[teamId] || []).includes(permission)
  );
};

export const billingGetBillingInfo = defineAbility(
  (user: User | null, teamId: string) =>
    hasTeamPermission(user, teamId, PERMISSIONS.TEAMS.BILLING.VIEW),
);
