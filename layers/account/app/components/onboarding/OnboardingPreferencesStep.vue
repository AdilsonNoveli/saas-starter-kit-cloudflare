<script setup lang="ts">
import type { Preferences } from "../../../shared/utils/preferences";

// Onboarding step 2 (SPEC-0010, FR-004): time zone and language as the
// browser reports them, to confirm, plus the date format and the name order.
// The fields and their errors are AccountPreferencesForm's; picking a language
// switches the interface at once, so the rest of the onboarding reads in it.
const preferences = defineModel<Preferences>({ required: true });
const emit = defineEmits<{ back: []; next: [] }>();

const { t, setLocale } = useI18n();

watch(
  () => preferences.value.locale,
  (locale) => setLocale(locale),
);
</script>

<template>
  <div class="space-y-6">
    <header class="space-y-1">
      <h2 tabindex="-1" class="text-xl font-semibold text-highlighted focus:outline-none">
        {{ t("account.onboarding.preferences.title") }}
      </h2>
      <p id="onboarding-preferences-description" class="text-muted">
        {{ t("account.onboarding.preferences.description") }}
      </p>
    </header>

    <AccountPreferencesForm
      id="onboarding-preferences"
      v-model="preferences"
      :fields="['timeZone', 'locale', 'dateFormat', 'nameOrder']"
      aria-describedby="onboarding-preferences-description"
      @submit="emit('next')"
    >
      <template #actions>
        <div class="flex justify-between gap-3 pt-2">
          <UButton
            color="neutral"
            variant="ghost"
            icon="i-ph-arrow-left-duotone"
            :label="t('account.onboarding.actions.back')"
            @click="emit('back')"
          />
          <UButton type="submit" trailing-icon="i-ph-arrow-right-duotone" :label="t('account.onboarding.actions.next')" />
        </div>
      </template>
    </AccountPreferencesForm>
  </div>
</template>
