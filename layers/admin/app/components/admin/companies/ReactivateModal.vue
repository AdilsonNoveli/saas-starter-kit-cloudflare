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

const toast = useToast();
const reactivateMutation = useTrpcClient().admin.teams.reactivateTeam;

async function confirm() {
  try {
    await reactivateMutation.mutate({ teamId: props.team.id });
    open.value = false;
    toast.add({
      title: "Company reactivated",
      description: `${props.team.name} is active again.`,
      color: "success",
      icon: "i-lucide-check",
    });
    emit("success");
  } catch (error) {
    toast.add({
      title: "Failed to reactivate company",
      description:
        error instanceof Error ? error.message : "Something went wrong",
      color: "error",
      icon: "i-lucide-circle-x",
    });
  }
}
</script>
