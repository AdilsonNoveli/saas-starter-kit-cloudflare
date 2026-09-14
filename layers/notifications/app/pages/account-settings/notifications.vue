<template>
  <UPageCard variant="subtle">
    <div class="flex justify-between items-center gap-4">
      <div class="flex flex-col">
        <p class="font-semibold">Receive notifications</p>
        <p class="text-sm text-muted">Want to receive notifications?</p>
      </div>
      <USwitch v-model="notificationsEnabled" size="md" color="primary" />
    </div>
  </UPageCard>
</template>

<script setup lang="ts">
const notificationsStore = useNotificationsStore();
const notificationsEnabled = computed({
  get: () => notificationsStore.enabled,
  set: (value) => notificationsStore.setNotificationsEnabled(value),
});

onMounted(() => {
  notificationsStore.initializeNotificationSettings();
});
</script>
