// `useGetBillingInfoAbility` lives here, not in `layers/teams/app/composables/
// use-ability.ts` where it sat from Fase 3 passo 1b through 2a: the ability it
// wraps (`billingGetBillingInfo`) moved to this layer in passo 2a, and passo 2b
// co-locates the wrapper with it — the same domain-ownership rule every other
// move in this migration followed. Its one caller,
// `layers/teams/app/composables/use-team-settings-links.ts`, imports it from
// this layer by package subpath; the three genuinely teams-owned wrappers
// (`useUpdateTeamDetailsAbility`, `useDeleteTeamAbility`,
// `useListMembersAndInvitesAbility`) stayed behind.
//
// `@nuxfire/layer-billing/shared/...`, not `#shared/utils/abilities`: `#shared`
// is aliased by Nuxt to the Composition Root's own `shared/` directory and
// never reaches a layer's.
import { billingGetBillingInfo } from "@nuxfire/layer-billing/shared/utils/abilities";

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
