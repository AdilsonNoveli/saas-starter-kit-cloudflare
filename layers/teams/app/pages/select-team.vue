<template>
  <UDashboardPanel id="select-team">
    <template #header>
      <UDashboardNavbar :title="t('teams.select.title')">
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
const { t } = useI18n();

definePageMeta({
  layout: "dashboard",
});
</script>
