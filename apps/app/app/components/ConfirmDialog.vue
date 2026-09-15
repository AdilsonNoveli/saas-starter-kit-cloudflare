<!--
  Singleton confirmation dialog, mounted once in `app.vue`. Never imported
  directly by a page — call `useNotification().confirm({ title, ... })` and
  await the boolean it resolves with; this component only renders whatever
  request that call put into the shared `confirm-dialog` state.
-->
<template>
  <UModal
    :open="isOpen"
    @update:open="(value: boolean) => { if (!value) handleCancel() }"
  >
    <template #content>
      <UCard v-if="request">
        <template #header>
          <div class="flex items-center gap-2" :class="toneClass">
            <UIcon :name="icon" />
            <span class="font-medium">{{ request.options.title }}</span>
          </div>
        </template>

        <p v-if="request.options.description" class="text-sm text-muted">
          {{ request.options.description }}
        </p>

        <template #footer>
          <div class="flex gap-2 w-full justify-end">
            <UButton
              variant="ghost"
              color="neutral"
              :label="request.options.cancelLabel ?? 'Cancelar'"
              @click="handleCancel"
            />
            <UButton
              :color="request.options.color ?? 'error'"
              :label="request.options.confirmLabel ?? 'Confirmar'"
              @click="handleConfirm"
            />
          </div>
        </template>
      </UCard>
    </template>
  </UModal>
</template>

<script setup lang="ts">
const dialog = useConfirmDialogState();
const request = computed(() => dialog.value);
const isOpen = computed(() => request.value !== null);

const tone = computed(() => request.value?.options.color ?? "error");

const icon = computed(
  () =>
    ({
      error: "i-lucide-trash-2",
      warning: "i-lucide-triangle-alert",
      primary: "i-lucide-info",
    })[tone.value],
);

const toneClass = computed(
  () =>
    ({
      error: "text-error",
      warning: "text-warning",
      primary: "text-primary",
    })[tone.value],
);

function settle(confirmed: boolean) {
  dialog.value?.resolve(confirmed);
  dialog.value = null;
}

const handleConfirm = () => settle(true);
const handleCancel = () => settle(false);
</script>
