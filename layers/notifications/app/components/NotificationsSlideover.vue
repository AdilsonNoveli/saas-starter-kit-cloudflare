<template>
  <USlideover v-model:open="isNotificationsSlideoverOpen" title="Notifications">
    <template #body>
      <p v-if="notifications.length === 0" class="py-4 text-center text-muted">
        No notifications
      </p>

      <div v-else class="divide-y divide-default">
        <div
          v-for="notification in notifications"
          :key="notification.id"
          class="px-3 py-2.5 -mx-3 flex items-start justify-between gap-4 hover:bg-elevated/50 transition-colors"
        >
          <div class="text-sm">
            <p class="font-medium text-highlighted">{{ notification.title }}</p>
            <p class="text-muted">{{ notification.message }}</p>
          </div>

          <div class="flex flex-col items-end gap-2 shrink-0">
            <span
              v-if="!notification.read"
              class="size-2 rounded-sm bg-primary"
            />
            <time
              :datetime="new Date(notification.createdAt).toISOString()"
              class="text-xs text-dimmed"
              v-text="formatTimeAgo(new Date(notification.createdAt))"
            />
          </div>
        </div>
      </div>
    </template>
  </USlideover>
</template>

<script setup lang="ts">
import { formatTimeAgo } from "@vueuse/core";

const { isNotificationsSlideoverOpen } = useDashboard();
const notificationsStore = useNotificationsStore();
const { ordered: notifications, unread } = storeToRefs(notificationsStore);

watch(isNotificationsSlideoverOpen, (isOpen) => {
  if (isOpen || unread.value === 0) return;
  notificationsStore.markAsRead();
});
</script>
