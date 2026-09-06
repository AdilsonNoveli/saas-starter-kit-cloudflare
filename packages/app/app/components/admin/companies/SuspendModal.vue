<template>
  <UModal
    v-model:open="open"
    :title="`Suspend ${team.name}?`"
    description="Members lose access to this company immediately. You can reactivate it at any time."
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
          label="Suspend"
          color="error"
          variant="solid"
          loading-auto
          @click="confirm"
        />
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
/**
 * Usable two ways: pass a trigger through the default slot (detail page), or
 * drive `v-model:open` from outside (the companies table, whose trigger lives
 * inside a dropdown item and so cannot wrap this component).
 */
const props = defineProps<{ team: { id: string; name: string } }>();
const open = defineModel<boolean>("open", { default: false });
const emit = defineEmits<{ success: [] }>();

const toast = useToast();
const suspendMutation = useTrpcClient().admin.teams.suspendTeam;

async function confirm() {
  try {
    await suspendMutation.mutate({ teamId: props.team.id });
    open.value = false;
    toast.add({
      title: "Company suspended",
      description: `${props.team.name} is now suspended.`,
      color: "success",
      icon: "i-lucide-check",
    });
    // The caller owns the data, so it owns the refetch.
    emit("success");
  } catch (error) {
    toast.add({
      title: "Failed to suspend company",
      description:
        error instanceof Error ? error.message : "Something went wrong",
      color: "error",
      icon: "i-lucide-circle-x",
    });
  }
}
</script>
