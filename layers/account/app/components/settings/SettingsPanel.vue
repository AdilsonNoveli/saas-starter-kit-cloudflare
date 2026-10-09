<script setup lang="ts">
import type { NavigationMenuItem } from "@nuxt/ui";

defineProps<{
  id: string;
  title: string;
  links: NavigationMenuItem[];
}>();

const route = useRoute();
const isWide = computed(
  () => Boolean(route.meta?.wide) || route.path.endsWith("/settings/billing"),
);
</script>

<template>
  <UDashboardPanel :id="id" :ui="{ body: 'lg:py-12' }">
    <template #header>
      <UDashboardNavbar :title="title">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <AccountHeaderActions />
        </template>
      </UDashboardNavbar>

      <UDashboardToolbar>
        <!--
          `-mx-1` aligns the menu with the DashboardSidebarCollapse button.
          `variant="link"` (not the app-wide default `pill`) so the active tab
          is only the underline + brand-colored label — the `pill` variant
          adds a tinted background and ring (fine for the sidebar it was
          designed for), which read as a button here, not a tab.
        -->
        <UNavigationMenu :items="[links]" highlight variant="link" class="-mx-1 flex-1" />
      </UDashboardToolbar>
    </template>

    <template #body>
      <div
        :class="[
          'flex flex-col gap-4 sm:gap-6 lg:gap-12 w-full mx-auto',
          isWide ? 'max-w-6xl' : 'lg:max-w-2xl',
        ]"
      >
        <NuxtPage />
      </div>
    </template>
  </UDashboardPanel>
</template>
