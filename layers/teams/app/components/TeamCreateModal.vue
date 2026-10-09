<template>
  <UModal v-model:open="open" :dismissible="false" :title="t('teams.create.title')">
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
              <span class="font-semibold">{{ t("teams.create.title") }}</span>
              <UButton
                icon="i-ph-x-duotone"
                variant="ghost"
                color="neutral"
                :aria-label="t('teams.create.close')"
                @click="close"
              />
            </div>
          </template>

          <div class="space-y-4">
            <UFormField :label="t('teams.create.nameLabel')" name="name" required>
              <UInput
                v-model="createForm.name"
                :placeholder="t('teams.create.namePlaceholder')"
                type="text"
              />
            </UFormField>
            <UFormField :label="t('teams.create.slugLabel')" name="slug" required>
              <UInput
                v-model="createForm.slug"
                :placeholder="t('teams.create.slugPlaceholder')"
                type="text"
                @update:model-value="isSlugUserEdited = true"
              />
            </UFormField>
          </div>

          <template #footer>
            <div class="w-full flex justify-end">
              <UButton :loading="loading" type="submit" :label="t('teams.create.submit')" />
            </div>
          </template>
        </UCard>
      </UForm>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { z } from "zod/v4";
import { slugify, validateSlug } from "@nuxfire/layer-teams/shared/utils/slug";

const open = defineModel<boolean>("open", { default: false });

const { t } = useI18n();
const notification = useNotification();
const teamsStore = useTeamsStore();
const createMutation = useTrpcClient().teams.create;

// The same limits and slug rule as `teams.create` (shared/utils/slug.ts), so
// the form never accepts what the server refuses. Slug messages come from the
// error catalog (`errors.slug_*`, auto-imported `translateErrorCode`).
const createTeamSchema = z.object({
  name: z.string().trim().min(2, t("teams.create.nameLength")).max(50, t("teams.create.nameLength")),
  slug: z.string().superRefine((slug, ctx) => {
    const result = validateSlug(slug);
    if (result !== "ok") ctx.addIssue({ code: "custom", message: translateErrorCode(result, t) });
  }),
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
    createForm.slug = slugify(newName);
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
    // The server answers a taken or refused slug with its code
    // (`slug_taken`...); anything else becomes the generic message.
    notification.error(t("teams.create.failed"), translateErrorCode(getErrorMessage(error), t));
  } finally {
    loading.value = false;
  }
}
</script>
