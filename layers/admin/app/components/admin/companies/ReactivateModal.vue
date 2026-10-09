<template>
  <UModal
    v-model:open="open"
    :title="`Reactivate ${team.name}?`"
    description="Members regain access to this company immediately."
  >
    <slot />

    <template #body>
      <div class="flex justify-end gap-2">
        <UButton
          label="Cancel"
          color="neutral"
          variant="subtle"
          @click="open = false"
        />
        <UButton
          label="Reactivate"
          color="primary"
          variant="solid"
          loading-auto
          @click="confirm"
        />
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
/** Mirror of SuspendModal — see the note there about the two trigger modes. */
const props = defineProps<{ team: { id: string; name: string } }>();
const open = defineModel<boolean>("open", { default: false });
const emit = defineEmits<{ success: [] }>();

const notification = useNotification();
const reactivateMutation = useTrpcClient().admin.teams.reactivateTeam;

async function confirm() {
  try {
    await reactivateMutation.mutate({ teamId: props.team.id });
    open.value = false;
    notification.success("Company reactivated", `${props.team.name} is active again.`);
    emit("success");
  } catch (error) {
    notification.error("Failed to reactivate company", error instanceof Error ? error.message : "Something went wrong");
  }
}
</script>
