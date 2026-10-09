<template>
  <div>
    <UPageCard
      :title="t('account.preferencesPage.title')"
      :description="t('account.preferencesPage.description')"
      variant="naked"
      orientation="horizontal"
      class="mb-4"
    >
      <div v-if="preferences" class="flex gap-2 lg:ms-auto">
        <UButton
          color="neutral"
          variant="ghost"
          :label="t('account.common.discard')"
          :disabled="saving"
          @click="discard"
        />
        <UButton
          form="account-preferences"
          type="submit"
          color="neutral"
          :loading="saving"
          :label="t('account.preferencesPage.save')"
        />
      </div>
    </UPageCard>

    <UPageCard variant="subtle">
      <AccountPreferencesForm
        v-if="preferences"
        id="account-preferences"
        v-model="preferences"
        @submit="save"
      />
      <UAlert
        v-else
        color="error"
        variant="subtle"
        icon="i-ph-warning-circle-duotone"
        :title="t('account.preferencesPage.loadFailed')"
      />
    </UPageCard>
  </div>
</template>

<script setup lang="ts">
import type { Preferences } from "../../../shared/utils/preferences";
import { defaultFormatsFor, preferencesSchema } from "../../../shared/utils/preferences";

// Preferências (SPEC-0010, AC-014, DEC-017; the route keeps its old name): the
// five fields of AccountPreferencesForm, read from and saved to the person's
// preferences. Language and theme switch the screen as soon as they are
// picked, the same way the header does; "Discard" puts the saved ones back.
const { t, setLocale } = useI18n();
const colorMode = useColorMode();
const notification = useNotification();
const trpc = useTrpcClient();

const { data: row } = await trpc.account.preferences.get.useQuery();

/** The saved row as the form's shape, or null when it cannot be read. */
function fromRow(value: unknown): Preferences | null {
  const parsed = preferencesSchema.safeParse(value);
  if (!parsed.success) return null;
  const { dateFormat, nameOrder, ...rest } = parsed.data;
  const defaults = defaultFormatsFor(rest.locale);
  return {
    ...rest,
    dateFormat: dateFormat ?? defaults.dateFormat,
    nameOrder: nameOrder ?? defaults.nameOrder,
  };
}

const saved = ref(fromRow(row.value));
const preferences = ref(saved.value ? { ...saved.value } : null);
const saving = ref(false);

watch(
  () => preferences.value?.locale,
  (locale) => {
    if (locale) setLocale(locale);
  },
);
watch(
  () => preferences.value?.theme,
  (theme) => {
    if (theme) colorMode.preference = theme;
  },
);

function discard() {
  if (saved.value) preferences.value = { ...saved.value };
}

async function save(value: Preferences) {
  saving.value = true;
  try {
    const result = await trpc.account.preferences.update.mutate(value);
    saved.value = fromRow(result) ?? value;
    // The session carries locale and theme for the next page load.
    await useSession().refresh();
    notification.success(t("account.preferencesPage.saved"));
  } catch (error) {
    notification.error(
      t("account.preferencesPage.saveFailed"),
      translateErrorCode(error instanceof Error ? error.message : "", (key) => t(key)),
    );
  } finally {
    saving.value = false;
  }
}
</script>
