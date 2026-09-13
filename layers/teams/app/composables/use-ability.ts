// `@nuxfire/layer-teams/shared/...`, not `#shared/utils/abilities`: `#shared`
// is aliased by Nuxt to the Composition Root's own `shared/` directory
// (packages/app/shared) and never reaches a layer's. This file used to live in
// packages/app and relied on a re-export bridge there; the bridge was deleted
// with this move (Fase 3, passo 1b).
import {
  teamsDeleteTeam,
  teamsListMembersAndInvites,
  teamsUpdateTeamDetails,
} from "@nuxfire/layer-teams/shared/utils/abilities";
// The ability behind this one wrapper moved to layers/billing in Fase 3 passo
// 2a (`teamsGetBillingInfo` -> `billingGetBillingInfo`); only the import and
// the identifier changed here. The wrapper itself is still called from this
// layer (`use-team-settings-links.ts`, to decide whether the Billing tab
// renders), so it stays put until passo 2b moves the billing frontend and can
// decide where it really belongs.
import { billingGetBillingInfo } from "@nuxfire/layer-billing/shared/utils/abilities";

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
      allows(
        billingGetBillingInfo,
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
