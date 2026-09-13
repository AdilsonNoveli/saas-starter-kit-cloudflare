// `@nuxfire/layer-teams/shared/...`, not `#shared/utils/abilities`: `#shared`
// is aliased by Nuxt to the Composition Root's own `shared/` directory
// (packages/app/shared) and never reaches a layer's. This file used to live in
// packages/app and relied on a re-export bridge there; the bridge was deleted
// with this move (Fase 3, passo 1b).
import {
  teamsDeleteTeam,
  teamsGetBillingInfo,
  teamsListMembersAndInvites,
  teamsUpdateTeamDetails,
} from "@nuxfire/layer-teams/shared/utils/abilities";

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

export const useGetBillingInfoAbility = (team: Ref<string>) => {
  return useAsyncData(
    () =>
      allows(teamsGetBillingInfo, typeof team === "string" ? team : team.value),
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
