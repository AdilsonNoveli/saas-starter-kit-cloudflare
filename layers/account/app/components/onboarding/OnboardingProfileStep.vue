<script setup lang="ts">
import { z } from "zod/v4";
import { NAME_MAX_LENGTH, NAME_MIN_LENGTH } from "../../../shared/utils/onboarding-name";

// Onboarding step 1 (SPEC-0010, FR-004, AC-004): the person's name, suggested
// from the e-mail when the sign-up had none, always editable.
const name = defineModel<string>({ required: true });
const emit = defineEmits<{ next: [] }>();

const { t } = useI18n();

const lengthError = () =>
  t("account.onboarding.lengthError", { min: NAME_MIN_LENGTH, max: NAME_MAX_LENGTH });

const schema = z.object({
  name: z
    .string()
    .trim()
    .min(NAME_MIN_LENGTH, { error: lengthError })
    .max(NAME_MAX_LENGTH, { error: lengthError }),
});
const state = computed(() => ({ name: name.value }));
</script>

<template>
  <div class="space-y-6">
    <header class="space-y-1">
      <h2 tabindex="-1" class="text-xl font-semibold text-highlighted focus:outline-none">
        {{ t("account.onboarding.profile.title") }}
      </h2>
      <p class="text-muted">{{ t("account.onboarding.profile.description") }}</p>
    </header>

    <UForm
      id="onboarding-profile"
      :schema="schema"
      :state="state"
      :validate-on="['blur']"
      class="space-y-6"
      @submit="emit('next')"
    >
      <UFormField name="name" :label="t('account.onboarding.profile.name')" required>
        <UInput v-model="name" autocomplete="name" class="w-full" />
      </UFormField>

      <div class="flex justify-end pt-2">
        <UButton type="submit" trailing-icon="i-ph-arrow-right-duotone" :label="t('account.onboarding.actions.next')" />
      </div>
    </UForm>
  </div>
</template>
