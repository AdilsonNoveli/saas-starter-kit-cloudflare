<script setup lang="ts">
import type { NavigationMenuItem } from "@nuxt/ui";

defineProps<{
  id: string;
  title: string;
  links: NavigationMenuItem[];
}>();
</script>

<template>
  <UDashboardPanel :id="id" :ui="{ body: 'lg:py-12' }">
    <template #header>
      <UDashboardNavbar :title="title">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>

      <UDashboardToolbar>
        <!-- `-mx-1` aligns the menu with the DashboardSidebarCollapse button. -->
        <UNavigationMenu :items="[links]" highlight class="-mx-1 flex-1" />
      </UDashboardToolbar>
    </template>

    <template #body>
      <div class="flex flex-col gap-4 sm:gap-6 lg:gap-12 w-full lg:max-w-2xl mx-auto">
        <NuxtPage />
      </div>
    </template>
  </UDashboardPanel>
</template>
