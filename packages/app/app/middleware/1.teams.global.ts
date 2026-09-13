// STAYS IN THE COMPOSITION ROOT — do not move this into layers/teams.
//
// Fase 3 passo 1b moved the rest of the teams frontend into the layer and
// tried to move this too. It builds and typechecks either way, but the built
// route-middleware pipeline proves it is wrong: Nuxt collects global
// middleware per layer, sorting by filename only WITHIN a layer, then
// concatenates the layers with the Composition Root LAST
// (`reversedLayerDirs` in nuxt/dist, `_layers` reversed). From inside the
// layer this file therefore ran BEFORE `0.auth.global.ts`, and no filename can
// change that — the `0.`/`1.` prefixes only order files that live in the same
// middleware directory.
//
// Running before auth is a real regression, not a cosmetic one: for a
// logged-out visitor deep-linking to /{team}/dashboard, `fetchTeam()` below
// fails (no session yet), this redirects to /select-team, and 0.auth.global.ts
// then records THAT as the post-login return path — so the user lands on the
// team picker instead of the page they asked for. Verified by grepping the
// global-middleware array out of `nuxt build`'s server bundle: layer-first,
// root-last.
//
// `invite.ts` did move into the layer, and correctly so: it is NAMED
// middleware (`definePageMeta({ middleware: "invite" })`), and named
// middleware always runs after every global one, in the order the page lists,
// regardless of which layer defines it.
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
