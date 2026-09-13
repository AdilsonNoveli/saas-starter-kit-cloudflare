<template>
  <UDashboardPanel id="select-team">
    <template #header>
      <UDashboardNavbar title="Teams">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <TeamSwitcher />
    </template>
  </UDashboardPanel>
</template>

<script setup lang="ts">
definePageMeta({
  layout: "dashboard",
});
</script>
