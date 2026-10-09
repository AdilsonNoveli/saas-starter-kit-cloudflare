<script setup lang="ts">
import { z } from "zod/v4";
import type { Form } from "@nuxt/ui";
import { slugify, validateSlug } from "@nuxfire/layer-teams/shared/utils/slug";
import { NAME_MAX_LENGTH, NAME_MIN_LENGTH } from "../../../shared/utils/onboarding-name";

// Onboarding step 3 (SPEC-0010, FR-004, FR-005, AC-006): the person's own
// Space, its address derived from the name until they edit it, or, when an
// invitation is waiting, the invited Space to join instead. The page sends
// everything; this step only collects and validates.
interface SpaceInput {
  name: string;
  slug: string;
}

const space = defineModel<SpaceInput>({ required: true });

const props = defineProps<{
  /** The pending invitation, which replaces the Space form. */
  invite: { id: string; team: { name: string; slug: string } } | null;
  loading?: boolean;
}>();

const emit = defineEmits<{ back: []; submit: [] }>();

const { t } = useI18n();

const lengthError = () =>
  t("account.onboarding.lengthError", { min: NAME_MIN_LENGTH, max: NAME_MAX_LENGTH });

const schema = z.object({
  name: z
    .string()
    .trim()
    .min(NAME_MIN_LENGTH, { error: lengthError })
    .max(NAME_MAX_LENGTH, { error: lengthError }),
  // The one slug rule of layers/teams, the same the server applies.
  slug: z.string().superRefine((slug, ctx) => {
    const result = validateSlug(slug);
    if (result !== "ok") {
      ctx.addIssue({ code: "custom", message: translateErrorCode(result, (key) => t(key)) });
    }
  }),
});

// The address follows the name until the person types one of their own.
// Coming back to this step keeps an address the person had typed.
const slugEdited = ref(space.value.slug !== "" && space.value.slug !== slugify(space.value.name));
watch(
  () => space.value.name,
  (name) => {
    if (!slugEdited.value) space.value = { ...space.value, slug: slugify(name) };
  },
  { immediate: true },
);

function setName(name: string) {
  space.value = { ...space.value, name };
}

function setSlug(slug: string) {
  slugEdited.value = true;
  space.value = { ...space.value, slug };
}

const form = useTemplateRef<Form<z.output<typeof schema>>>("form");

defineExpose({
  /** Shows a server refusal of the address (`slug_taken`...) next to the field. */
  setSlugError(message: string) {
    form.value?.setErrors([{ name: "slug", message }]);
  },
});
</script>

<template>
  <div class="space-y-6">
    <template v-if="props.invite">
      <header class="space-y-1">
        <h2 tabindex="-1" class="text-xl font-semibold text-highlighted focus:outline-none">
          {{ t("account.onboarding.space.inviteTitle") }}
        </h2>
        <p class="text-muted">
          {{ t("account.onboarding.space.inviteDescription", { name: props.invite.team.name }) }}
        </p>
      </header>

      <div class="flex justify-between gap-3 pt-2">
        <UButton
          color="neutral"
          variant="ghost"
          icon="i-ph-arrow-left-duotone"
          :label="t('account.onboarding.actions.back')"
          @click="emit('back')"
        />
        <UButton
          icon="i-ph-sign-in-duotone"
          :loading="loading"
          :label="t('account.onboarding.actions.join')"
          @click="emit('submit')"
        />
      </div>
    </template>

    <template v-else>
      <header class="space-y-1">
        <h2 tabindex="-1" class="text-xl font-semibold text-highlighted focus:outline-none">
          {{ t("account.onboarding.space.title") }}
        </h2>
        <p class="text-muted">{{ t("account.onboarding.space.description") }}</p>
      </header>

      <UForm
        ref="form"
        id="onboarding-space"
        :schema="schema"
        :state="space"
        :validate-on="['blur']"
        class="space-y-6"
        @submit="emit('submit')"
      >
        <UFormField name="name" :label="t('account.onboarding.space.name')" required>
          <UInput :model-value="space.name" class="w-full" @update:model-value="setName" />
        </UFormField>

        <UFormField
          name="slug"
          :label="t('account.onboarding.space.slug')"
          :description="t('account.onboarding.space.slugHint')"
          required
        >
          <UInput
            :model-value="space.slug"
            autocapitalize="none"
            spellcheck="false"
            class="w-full font-mono"
            @update:model-value="setSlug"
          />
        </UFormField>

        <div class="flex justify-between gap-3 pt-2">
          <UButton
            color="neutral"
            variant="ghost"
            icon="i-ph-arrow-left-duotone"
            :label="t('account.onboarding.actions.back')"
            @click="emit('back')"
          />
          <UButton type="submit" icon="i-ph-check-duotone" :loading="loading" :label="t('account.onboarding.actions.create')" />
        </div>
      </UForm>
    </template>
  </div>
</template>
