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
      :ui="{
        root: 'border-e border-default',
        footer: 'lg:border-t lg:border-default',
      }"
    >
      <template #header="{ collapsed: isCollapsed }">
        <div
          class="flex items-center gap-2 w-full"
          :class="isCollapsed ? 'flex-col items-center gap-2' : 'justify-between'"
        >
          <UDashboardSidebarCollapse v-if="isCollapsed" />
          <TeamSwitcherDropdown :collapsed="isCollapsed" :class="isCollapsed ? '' : 'flex-1 min-w-0'" />
          <UDashboardSidebarCollapse v-if="!isCollapsed" />
        </div>
      </template>

      <template #default="{ collapsed: isCollapsed }">
        <UNavigationMenu
          v-if="currentTeam?.slug"
          :collapsed="isCollapsed"
          :items="links"
          orientation="vertical"
          tooltip
          popover
          class="px-2"
        />
      </template>

      <template #footer="{ collapsed: isCollapsed }">
        <AccountUserDropdown :collapsed="isCollapsed" />
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
import type { NavigationMenuItem } from "@nuxt/ui";

const open = ref(false);
const collapsed = ref(true);
const currentTeam = useCurrentTeam();
const baseRoute = computed(() => `/${currentTeam.value?.slug}`);
const teamID = computed(() => currentTeam.value?.id || "");

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
