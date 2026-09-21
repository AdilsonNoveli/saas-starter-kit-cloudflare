// `@nuxfire/layer-teams/shared/...`, not `#shared/utils/abilities`: `#shared`
// is aliased by Nuxt to the Composition Root's own `shared/` directory
// (apps/app/shared) and never reaches a layer's. This file used to live in
// apps/app and relied on a re-export bridge there; the bridge was deleted
// with this move (Fase 3, passo 1b).
import {
  teamsDeleteTeam,
  teamsListMembersAndInvites,
  teamsUpdateTeamDetails,
} from "@nuxfire/layer-teams/shared/utils/abilities";
// `useGetBillingInfoAbility` is NOT here: it wraps `billingGetBillingInfo`,
// which moved to layers/billing in Fase 3 passo 2a, and the wrapper followed it
// in passo 2b (`layers/billing/app/composables/use-ability.ts`). This layer
// still calls it — `use-team-settings-links.ts` decides whether the Billing tab
// renders — and imports it from that layer by package subpath.

export const useUpdateTeamDetailsAbility = (team: Ref<string>) => {
  return useAsyncData(
    () =>
      allows(
        teamsUpdateTeamDetails,
        typeof team === "string" ? team : team.value,
      ),
    { watch: [team] },
  );
};

export const useDeleteTeamAbility = (team: Ref<string>) => {
  return useAsyncData(
    () => allows(teamsDeleteTeam, typeof team === "string" ? team : team.value),
    { watch: [team] },
  );
};

export const useListMembersAndInvitesAbility = (team: Ref<string>) => {
  return useAsyncData(
    () =>
      allows(
        teamsListMembersAndInvites,
        typeof team === "string" ? team : team.value,
      ),
    { watch: [team] },
  );
};
