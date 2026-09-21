<template>
  <UModal v-model:open="open" :dismissible="false" title="Create Team">
    <template #content>
      <UForm
        :schema="createTeamSchema"
        :state="createForm"
        :validate-on="['input']"
        @submit="create"
      >
        <UCard>
          <template #header>
            <div class="flex items-center justify-between">
              <span class="font-semibold">Create Team</span>
              <UButton
                icon="i-lucide-x"
                variant="ghost"
                color="neutral"
                @click="close"
              />
            </div>
          </template>

          <div class="space-y-4">
            <UFormField label="Team Name" name="name" required>
              <UInput
                v-model="createForm.name"
                placeholder="Enter team name"
                type="text"
              />
            </UFormField>
            <UFormField label="Slug" name="slug" required>
              <UInput
                v-model="createForm.slug"
                placeholder="Enter team slug"
                type="text"
                @update:model-value="isSlugUserEdited = true"
              />
            </UFormField>
          </div>

          <template #footer>
            <div class="w-full flex justify-end">
              <UButton :loading="loading" type="submit">Create</UButton>
            </div>
          </template>
        </UCard>
      </UForm>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { z } from "zod";

const open = defineModel<boolean>("open", { default: false });

const notification = useNotification();
const teamsStore = useTeamsStore();
const createMutation = useTrpcClient().teams.create;

const createTeamSchema = z.object({
  name: z.string().min(1).max(16),
  slug: z
    .string()
    .min(1)
    .max(16)
    .regex(
      /^[a-z-]*$/,
      "Slug should contain only lower-case letters and hyphens.",
    ),
});

const createForm = reactive({ name: "", slug: "" });
const isSlugUserEdited = ref(false);
const loading = ref(false);

function reset() {
  createForm.name = "";
  createForm.slug = "";
  isSlugUserEdited.value = false;
}

function close() {
  open.value = false;
  reset();
}

watch(
  () => createForm.name,
  (newName) => {
    if (isSlugUserEdited.value) return;
    createForm.slug = newName
      .toLowerCase()
      .replace(/[^a-z\s-]/g, "")
      .replace(/\s+/g, "-")
      .slice(0, 16);
  },
);

async function create() {
  loading.value = true;
  try {
    const slug = createForm.slug;
    const result = await createMutation.mutate({
      name: createForm.name,
      slug,
    });
    if (result) {
      await teamsStore.fetchAllTeams();
      await useSession().refresh();
      close();
      navigateTo(`/${slug}/dashboard`);
    }
  } catch (error) {
    notification.error("Failed to create team", error instanceof Error ? error.message : "Something went wrong");
  } finally {
    loading.value = false;
  }
}
</script>
