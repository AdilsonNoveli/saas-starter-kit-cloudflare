export default defineNuxtRouteMiddleware(async (to) => {
  if (typeof to.name !== "string" || !to.name.startsWith("team")) return;
  const defaultPath = "/select-team";
  const teamsStore = useTeamsStore();
  if (!to.params.team) {
    teamsStore.setCurrentTeamId(null);
    if (to.path !== defaultPath) return navigateTo(defaultPath);
    return;
  }
  const teamSlug = to.params.team.toString();
  const team = await teamsStore.fetchTeam(teamSlug);
  if (!team && to.path !== defaultPath) {
    teamsStore.setCurrentTeamId(null);
    return navigateTo(defaultPath);
  }
  teamsStore.setCurrentTeamId(teamSlug);
});
