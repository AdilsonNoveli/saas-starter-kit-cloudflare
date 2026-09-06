<template>
  <UDashboardGroup unit="rem">
    <UDashboardSidebar
      id="dashboard"
      v-model:open="open"
      collapsible
      resizable
      class="bg-elevated/25"
      :ui="{ footer: 'lg:border-t lg:border-default' }"
    >
      <template #header="{ collapsed }">
        <TeamSwitcherDropdown :collapsed="collapsed" />
      </template>

      <template #default="{ collapsed }">
        <UNavigationMenu
          v-if="currentTeam?.slug"
          :collapsed="collapsed"
          :items="links"
          orientation="vertical"
          tooltip
          popover
        />
      </template>

      <template #footer="{ collapsed }">
        <AccountUserDropdown :collapsed="collapsed" />
      </template>
    </UDashboardSidebar>

    <slot />

    <NotificationsSlideover />
  </UDashboardGroup>
</template>

<script setup lang="ts">
import type { NavigationMenuItem } from "@nuxt/ui";

const open = ref(false);
const currentTeam = useCurrentTeam();
const baseRoute = computed(() => `/${currentTeam.value?.slug}`);
const teamID = computed(() => currentTeam.value?.id || "");

useDashboard();

const closeSidebar = () => {
  open.value = false;
};

const settingsLinks = useTeamSettingsLinks(teamID);
const settingsChildren = computed<NavigationMenuItem[]>(() =>
  settingsLinks.value.map((link) => ({ ...link, onSelect: closeSidebar })),
);

const links = computed<NavigationMenuItem[]>(() => [
  {
    label: "Dashboard",
    icon: "i-lucide-house",
    to: `${baseRoute.value}/dashboard`,
    onSelect: closeSidebar,
  },
  {
    label: "Settings",
    to: `${baseRoute.value}/settings`,
    icon: "i-lucide-settings",
    type: "trigger",
    children: settingsChildren.value,
  },
]);
</script>
