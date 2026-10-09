<template>
  <UModal
    v-model:open="open"
    title="Replay this message?"
    description="The message goes back to the job queue and is processed again from the start."
  >
    <template #body>
      <div class="flex flex-col gap-4">
        <div class="flex flex-col gap-1 text-sm">
          <p class="text-muted">
            Company:
            <span class="text-highlighted">{{ record.teamName ?? "—" }}</span>
          </p>
          <p class="text-muted break-words">{{ record.error }}</p>
        </div>

        <div class="flex justify-end gap-2">
          <UButton
            label="Cancel"
            color="neutral"
            variant="subtle"
            @click="open = false"
          />
          <UButton
            label="Replay"
            color="primary"
            variant="solid"
            loading-auto
            @click="confirm"
          />
        </div>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
/**
 * Unlike the company modals, this one is only ever driven by `v-model:open`
 * from the dead letter table — there is no place outside a row where
 * "replay *which* message?" has an answer, so it exposes no trigger slot.
 */
const props = defineProps<{
  record: { id: string; teamName: string | null; error: string };
}>();
const open = defineModel<boolean>("open", { default: false });
const emit = defineEmits<{ success: [] }>();

/** The literal the backend throws when `replayedAt` is already set. */
const ALREADY_REPLAYED = "This message has already been replayed";

const notification = useNotification();
const replayMutation = useTrpcClient().admin.queue.replayDeadLetter;

async function confirm() {
  try {
    await replayMutation.mutate({ id: props.record.id });
    open.value = false;
    notification.success("Message replayed", "It is back in the job queue.");
    // The caller owns the data, so it owns the refetch.
    emit("success");
  } catch (error) {
    const message = error instanceof Error ? error.message : "";

    // Losing the race against another admin (or another tab) is an expected
    // outcome here, not a failure: the message did get replayed, this screen
    // is just stale. Close and refetch so the table stops offering the action.
    if (message === ALREADY_REPLAYED) {
      open.value = false;
      notification.warning("Already replayed", "This message was sent back to the queue earlier.");
      emit("success");
      return;
    }

    notification.error("Failed to replay message", message || "Something went wrong");
  }
}
</script>
