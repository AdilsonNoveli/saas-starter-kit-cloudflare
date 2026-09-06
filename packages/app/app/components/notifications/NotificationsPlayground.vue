<template>
  <UCard>
    <template #header>
      <span>Notification Playground</span>
    </template>

    <UAlert
      variant="subtle"
      icon="i-lucide-info"
      color="primary"
      class="mb-4"
      description="Send notifications and receive them with Websockets (built with Cloudflare Durable Objects)."
    />

    <div class="p-2">
      <div class="space-y-2">
        <UInput v-model="title" placeholder="Notification title" />
        <UTextarea
          v-model="message"
          :rows="3"
          placeholder="Notification message (max 50 characters)..."
        />
        <div class="flex justify-between text-sm">
          <span class="text-muted">{{ message.length }}/50 characters</span>
          <span v-if="isTooLong" class="text-error">Message too long</span>
        </div>
      </div>

      <UButton
        class="mt-4"
        :loading="loading"
        :disabled="!message.trim() || isTooLong"
        @click="createNotification"
      >
        Send Notification
      </UButton>
    </div>
  </UCard>
</template>

<script setup lang="ts">
const notificationsStore = useNotificationsStore();

const title = ref("");
const message = ref("");
const loading = ref(false);

const isTooLong = computed(() => message.value.length > 50);

async function createNotification() {
  loading.value = true;
  try {
    await notificationsStore.createNotification(title.value, message.value);
    title.value = "";
    message.value = "";
  } finally {
    loading.value = false;
  }
}
</script>
