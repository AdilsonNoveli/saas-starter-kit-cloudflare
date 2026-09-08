<template>
  <UDashboardGroup unit="rem" :persistent="false">
    <UDashboardSidebar
      id="admin"
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
          class="flex items-center gap-2 w-full py-2 px-2"
          :class="isCollapsed ? 'flex-col items-center gap-2' : 'justify-between'"
        >
          <UDashboardSidebarCollapse v-if="isCollapsed" />
          <div class="flex items-center gap-2" :class="isCollapsed && 'justify-center'">
            <UIcon name="i-lucide-shield-check" class="size-5 shrink-0 text-warning" />
            <template v-if="!isCollapsed">
              <span class="font-semibold truncate text-highlighted">Platform</span>
              <UBadge label="Admin" color="warning" variant="subtle" size="sm" />
            </template>
          </div>
          <UDashboardSidebarCollapse v-if="!isCollapsed" />
        </div>
      </template>

      <template #default="{ collapsed: isCollapsed }">
        <UNavigationMenu
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
  </UDashboardGroup>
</template>

<script setup lang="ts">
import type { NavigationMenuItem } from "@nuxt/ui";

/**
 * The platform-owner shell. Deliberately not `dashboard.vue`: no team
 * switcher, no tenant notifications, and a badged header — the point is that
 * "am I looking at one customer or at every customer?" is answerable at a
 * glance, because the actions here are cross-tenant.
 */
const open = ref(false);
const collapsed = ref(true);

const closeSidebar = () => {
  open.value = false;
};

const route = useRoute();

/**
 * The MFA gate, in one place. Every `admin.*` procedure already rejects an
 * unenrolled or un-elevated admin with `FORBIDDEN`, but that leaves the screens
 * empty and the user guessing at a URL. One status read as the shell mounts
 * turns that into a redirect.
 *
 * Here rather than in `middleware/admin.ts` because the session payload does
 * not carry MFA state, and one HTTP call per navigation would be the price of
 * putting it there. Not by intercepting tRPC errors either: that would mean
 * classifying every `FORBIDDEN` across every procedure to find the ones this
 * page can fix, for no more coverage than a single read gives.
 */
onMounted(async () => {
  collapsed.value = true;
  if (route.path === "/admin/mfa") return;

  try {
    const status = await $fetch<{
      isPlatformAdmin: boolean;
      mfaEnrolled: boolean;
      sessionElevated: boolean;
    }>("/api/admin/mfa/status");

    if (
      status.isPlatformAdmin &&
      (!status.mfaEnrolled || !status.sessionElevated)
    ) {
      await navigateTo("/admin/mfa");
    }
  } catch {
    // A failed status read is not grounds to bounce anyone: the procedures
    // behind each screen are the real gate, and this is only the shortcut to
    // the screen that fixes it.
  }
});

const links = computed<NavigationMenuItem[]>(() => [
  {
    label: "Overview",
    icon: "i-lucide-layout-dashboard",
    to: "/admin",
    exact: true,
    onSelect: closeSidebar,
  },
  {
    label: "Companies",
    icon: "i-lucide-building-2",
    to: "/admin/companies",
    onSelect: closeSidebar,
  },
  {
    label: "Plans",
    icon: "i-lucide-credit-card",
    to: "/admin/plans",
    onSelect: closeSidebar,
  },
  {
    label: "Queue",
    icon: "i-lucide-list-checks",
    to: "/admin/queue",
    onSelect: closeSidebar,
  },
  {
    label: "Audit Log",
    icon: "i-lucide-scroll-text",
    to: "/admin/audit-log",
    onSelect: closeSidebar,
  },
  {
    // Without this the console is a one-way door: nothing else in the admin
    // shell links back to the tenant app.
    label: "Back to app",
    icon: "i-lucide-arrow-left",
    to: "/dashboard",
    onSelect: closeSidebar,
  },
]);
</script>
