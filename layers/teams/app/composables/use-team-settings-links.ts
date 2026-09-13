import type { NavigationMenuItem } from "@nuxt/ui";
// The only cross-layer composable this file uses. The other three ability
// wrappers below are this layer's own and come from Nuxt's auto-import;
// `useGetBillingInfoAbility` lives in layers/billing (it wraps that layer's
// `billingGetBillingInfo`), so it is imported explicitly by package subpath —
// same shape as the `@nuxfire/layer-billing/shared/utils/abilities` import that
// passo 2a introduced.
import { useGetBillingInfoAbility } from "@nuxfire/layer-billing/app/composables/use-ability";

/**
 * The ability-gated list of team settings sections (General/Members/Security
 * /Billing), shared between the sidebar's "Settings" trigger (`layouts/
 * dashboard.vue`) and the settings toolbar (`pages/[[team]]/settings.vue`) —
 * both need the exact same set of visible tabs for the same team, so this is
 * the single source of truth for it instead of two independently-maintained
 * copies of the same ability checks.
 */
export function useTeamSettingsLinks(teamID: Ref<string>) {
  const currentTeam = useCurrentTeam();
  const baseRoute = computed(() => `/${currentTeam.value?.slug}`);

  const { data: showMembers } = useListMembersAndInvitesAbility(teamID);
  const { data: showSecurity } = useDeleteTeamAbility(teamID);
  const { data: showBilling } = useGetBillingInfoAbility(teamID);

  return computed<NavigationMenuItem[]>(() => [
    {
      label: "General",
      icon: "i-lucide-settings",
      to: `${baseRoute.value}/settings`,
      exact: true,
    },
    ...(showMembers.value
      ? [
          {
            label: "Members",
            icon: "i-lucide-users",
            to: `${baseRoute.value}/settings/members`,
          },
        ]
      : []),
    ...(showSecurity.value
      ? [
          {
            // Label only — the page this section actually contains is "delete
            // this team", not credentials/2FA/sessions. The route stays
            // /settings/security so existing links/bookmarks keep working.
            label: "Danger Zone",
            icon: "i-lucide-shield",
            to: `${baseRoute.value}/settings/security`,
          },
        ]
      : []),
    ...(showBilling.value
      ? [
          {
            label: "Billing",
            icon: "i-lucide-credit-card",
            to: `${baseRoute.value}/settings/billing`,
          },
        ]
      : []),
  ]);
}
