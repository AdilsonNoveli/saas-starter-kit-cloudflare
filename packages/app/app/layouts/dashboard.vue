<template>
  <UDashboardGroup unit="rem" :persistent="false">
    <UDashboardSidebar
      id="dashboard"
      v-model:open="open"
      v-model:collapsed="collapsed"
      :collapsed-size="4.5"
      :default-size="16"
      collapsible
      resizable
      :ui="{ root: 'border-e border-default' }"
    >
      <!--
        No collapse toggle here — every page under this layout already has
        one in its own UDashboardNavbar #leading slot, so a second one next
        to the team switcher was two controls doing the same thing.
      -->
      <template #header="{ collapsed: isCollapsed }">
        <TeamSwitcherDropdown :collapsed="isCollapsed" />
      </template>

      <template #default="{ collapsed: isCollapsed }">
        <!--
          No horizontal padding here: the sidebar's own `body` slot already
          owns the gutter, so an extra inset only pushed these rows 8px right
          of the team switcher above them.
        -->
        <UNavigationMenu
          v-if="currentTeam?.slug"
          :collapsed="isCollapsed"
          :items="links"
          orientation="vertical"
          tooltip
          popover
        />
      </template>

      <template #footer="{ collapsed: isCollapsed }">
        <!--
          The gear-icon-on-the-team-card at /select-team was, until now, the
          only way into team settings — nothing inside a team itself linked
          there. `useTeamSettingsLinks` is the same ability-gated list the
          settings page's own toolbar renders (see its doc comment), reused
          here instead of duplicated so this trigger can never drift from
          which tabs a given user is actually allowed to see.
        -->
        <UDropdownMenu
          v-if="currentTeam?.slug"
          :items="settingsItems"
          :content="{
            align: 'center',
            side: 'top',
            sideOffset: 8,
            collisionPadding: 12,
          }"
          :ui="{
            content: isCollapsed
              ? 'w-56'
              : 'w-(--reka-dropdown-menu-trigger-width)',
          }"
        >
          <UButton
            icon="i-lucide-settings"
            :label="isCollapsed ? undefined : 'Settings'"
            color="neutral"
            variant="ghost"
            block
            :square="isCollapsed"
            class="data-[state=open]:bg-elevated"
          />
        </UDropdownMenu>
      </template>
    </UDashboardSidebar>

    <slot />

    <NotificationsSlideover />

    <AccountMfaSetupModal
      v-model:open="mfaChallengeOpen"
      mode="challenge"
      :dismissible="false"
      @success="mfaChallengeOpen = false"
    />
  </UDashboardGroup>
</template>

<script setup lang="ts">
import type { DropdownMenuItem, NavigationMenuItem } from "@nuxt/ui";

const open = ref(false);
const collapsed = ref(true);
const currentTeam = useCurrentTeam();
const baseRoute = computed(() => `/${currentTeam.value?.slug}`);
const teamID = computed(() => currentTeam.value?.id || "");

// Same ability the Billing tab in useTeamSettingsLinks already gates on —
// reused rather than re-derived, so this shortcut can't disagree with the
// settings page about who is allowed to see billing for this team.
const { data: showBilling } = useGetBillingInfoAbility(teamID);
const settingsLinks = useTeamSettingsLinks(teamID);
const layerLinks = useLayerNavigation();

useDashboard();

/**
 * The self-service 2FA gate, in one place, for every page under this layout
 * (dashboard, settings, account-settings). Mirrors layouts/admin.vue's own
 * MFA check, but "once per login" rather than a 30-minute re-challenge —
 * see user-mfa-session.ts — so this only ever fires right after a login on
 * a browser that hasn't verified yet, not repeatedly through the day.
 *
 * Short-circuits on `user.value?.mfaEnabled` (already in the session
 * middleware/0.auth.global.ts fetched before this layout ever mounts)
 * before hitting /api/mfa/status at all — the overwhelming majority of
 * users have MFA off, and this is the highest-traffic layout in the app, so
 * that one extra round trip per navigation isn't worth paying for accounts
 * this can never apply to.
 *
 * protectedProcedure (server/trpc/trpc.ts) is what actually enforces this;
 * this modal is only the UX shortcut so an unverified user gets a clear
 * prompt instead of every query on the page silently failing FORBIDDEN.
 */
const { user } = useSession();
const mfaChallengeOpen = ref(false);

onMounted(async () => {
  collapsed.value = true;
  if (!user.value?.mfaEnabled) return;
  const status = await $fetch<{ sessionVerified: boolean }>(
    "/api/mfa/status",
  ).catch(() => null);
  if (status && !status.sessionVerified) {
    mfaChallengeOpen.value = true;
  }
});

const closeSidebar = () => {
  open.value = false;
};

/*
 * Full team settings (General/Members/Danger Zone/Billing) stays out of this
 * primary nav — see the footer trigger below — but Plans/upgrade is content
 * navigation in its own right, the same way it sits in the primary nav of
 * most SaaS dashboards, so it gets its own entry instead of being buried a
 * click deeper in the settings dropdown.
 */
const links = computed<NavigationMenuItem[]>(() => [
  {
    label: "Dashboard",
    icon: "i-lucide-bolt",
    to: `${baseRoute.value}/dashboard`,
    onSelect: closeSidebar,
  },
  // Entries declared by the active Nuxt layers' manifests. `{team}` is the
  // placeholder a layer writes because it has no way to know which tenant is
  // open; this is the one place that knows, so it is substituted here.
  ...layerLinks.value.map((link) => ({
    label: link.label,
    icon: link.icon,
    to: link.to.replace("{team}", currentTeam.value?.slug ?? ""),
    onSelect: closeSidebar,
  })),
  ...(showBilling.value
    ? [
        {
          label: "Plans",
          icon: "i-lucide-crown",
          to: `${baseRoute.value}/settings/billing`,
          onSelect: closeSidebar,
        },
      ]
    : []),
]);

const settingsItems = computed<DropdownMenuItem[][]>(() => [
  settingsLinks.value.map((link) => ({
    label: link.label,
    icon: link.icon,
    to: link.to,
    onSelect: closeSidebar,
  })),
]);
</script>
