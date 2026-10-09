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
      :ui="{ root: 'border-e border-default', footer: 'pb-8 pt-1.5' }"
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
          Same `UNavigationMenu` the body list above renders with — not a
          hand-rolled button. A second, independently hardcoded copy of the
          nav-link classes (padding, collapsed size, active ring) is exactly
          what previously drifted out of sync with `packages/tokens` and left
          this icon a different width than every other row; routing it
          through the same component guarantees it always resolves the same
          `navigationMenu` theme tokens, with nothing to keep in sync by hand.
        -->
        <UNavigationMenu
          v-if="currentTeam?.slug"
          :collapsed="isCollapsed"
          :items="settingsItems"
          orientation="vertical"
          tooltip
          popover
        />
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

const links = computed<NavigationMenuItem[]>(() => [
  {
    label: "Dashboard",
    icon: "i-ph-lightning-duotone",
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
]);

/**
 * A single-item menu rather than a `settingsLinks`-driven list: the footer
 * trigger only ever opened "General" (Members/Billing/Danger Zone are
 * ability-gated tabs inside the settings page itself, not sidebar shortcuts),
 * so the extra lookup was indirection around a fixed destination. No `exact`
 * flag — unlike the settings page's own tab bar — so this stays highlighted
 * for every settings sub-route, not just the exact `/settings` path.
 */
const settingsItems = computed<NavigationMenuItem[]>(() => [
  {
    label: "Settings",
    icon: "i-ph-gear-duotone",
    to: `${baseRoute.value}/settings`,
    onSelect: closeSidebar,
  },
]);
</script>
