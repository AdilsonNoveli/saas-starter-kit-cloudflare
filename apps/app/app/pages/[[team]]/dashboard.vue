<template>
  <UDashboardPanel id="dashboard">
    <template #header>
      <UDashboardNavbar title="Dashboard">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <UTooltip text="Notifications" :shortcuts="['N']">
            <UButton
              color="neutral"
              variant="ghost"
              square
              @click="isNotificationsSlideoverOpen = true"
            >
              <UChip color="primary" :show="unread > 0" inset>
                <UIcon name="i-lucide-bell" class="size-5 shrink-0" />
              </UChip>
            </UButton>
          </UTooltip>

          <AccountUserDropdown collapsed size="md" />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="space-y-4 sm:space-y-6">
        <div class="text-2xl py-2">
          {{ $t("welcome") }}
        </div>

        <TeamDashboardStats />
        <TeamDashboardChart />
        <TeamDashboardActivity />
      </div>
    </template>
  </UDashboardPanel>
</template>

<script setup lang="ts">
definePageMeta({
  layout: "dashboard",
});

const { isNotificationsSlideoverOpen } = useDashboard();
const { unread } = storeToRefs(useNotificationsStore());
</script>
