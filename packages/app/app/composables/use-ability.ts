import {
  deleteTeam,
  getBillingInfo,
  listMembersAndInvites,
  updateTeamDetails,
} from "#shared/utils/abilities";

export const useUpdateTeamDetailsAbility = (team: Ref<string>) => {
  return useAsyncData(
    () =>
      allows(updateTeamDetails, typeof team === "string" ? team : team.value),
    { watch: [team] },
  );
};

export const useGetBillingInfoAbility = (team: Ref<string>) => {
  return useAsyncData(
    () => allows(getBillingInfo, typeof team === "string" ? team : team.value),
    { watch: [team] },
  );
};

export const useDeleteTeamAbility = (team: Ref<string>) => {
  return useAsyncData(
    () => allows(deleteTeam, typeof team === "string" ? team : team.value),
    { watch: [team] },
  );
};

export const useListMembersAndInvitesAbility = (team: Ref<string>) => {
  return useAsyncData(
    () =>
      allows(
        listMembersAndInvites,
        typeof team === "string" ? team : team.value,
      ),
    { watch: [team] },
  );
};
