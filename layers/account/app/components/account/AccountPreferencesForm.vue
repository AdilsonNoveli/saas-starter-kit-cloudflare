<script setup lang="ts">
import { z } from "zod/v4";
import { preferencesSchema, type Preferences } from "../../../shared/utils/preferences";

// The preference fields of a person (SPEC-0010, FR-002, FR-009), written once
// for the onboarding and the Preferences page. The rules are the shared
// `preferencesSchema`, the same the server applies; each field only gets its
// message in the person's language. The form edits a copy through v-model and
// emits `submit` once every shown field is valid.
type Field = keyof Preferences;

const state = defineModel<Preferences>({ required: true });

const props = withDefaults(
  defineProps<{
    /** The form's id, so a button outside it can submit it with `form`. */
    id: string;
    /** Which fields to show, in this order. */
    fields?: readonly Field[];
  }>(),
  { fields: () => ["locale", "timeZone", "theme", "dateFormat", "nameOrder"] },
);

const emit = defineEmits<{ submit: [value: Preferences] }>();

const { t, locales } = useI18n();

function shows(field: Field) {
  return props.fields.includes(field);
}

function set<K extends Field>(field: K, value: Preferences[K]) {
  state.value = { ...state.value, [field]: value };
}

/** One setter per field, so the template binds a function instead of writing one. */
const update = {
  locale: (value: Preferences["locale"]) => set("locale", value),
  timeZone: (value: Preferences["timeZone"]) => set("timeZone", value),
  theme: (value: Preferences["theme"]) => set("theme", value),
  dateFormat: (value: Preferences["dateFormat"]) => set("dateFormat", value),
  nameOrder: (value: Preferences["nameOrder"]) => set("nameOrder", value),
};

/** A field of the shared schema, with the message of its stable error code. */
function localized<T extends z.ZodType>(field: T, code: string) {
  return z.custom<z.output<T>>((value) => field.safeParse(value).success, {
    error: () => translateErrorCode(code, (key) => t(key)),
  });
}

const { shape } = preferencesSchema;
const schema = z.object({
  locale: localized(shape.locale, "invalid_locale"),
  timeZone: localized(shape.timeZone, "invalid_time_zone"),
  theme: localized(shape.theme, "invalid_theme"),
  dateFormat: localized(shape.dateFormat, "invalid_date_format"),
  nameOrder: localized(shape.nameOrder, "invalid_name_order"),
});

const localeItems = computed(() =>
  locales.value.map((item) => ({ label: item.name ?? item.code, value: item.code })),
);

// The runtime's list, plus the browser's own zone and the saved one when the
// list leaves them out (some engines omit `UTC` and still accept it).
const timeZoneItems = computed(() => {
  const zones = new Set(Intl.supportedValuesOf("timeZone"));
  for (const extra of [Intl.DateTimeFormat().resolvedOptions().timeZone, state.value.timeZone]) {
    if (extra) zones.add(extra);
  }
  return [...zones].sort().map((zone) => ({ label: zone.replaceAll("_", " "), value: zone }));
});

const themeItems = computed(() => [
  { label: t("account.preferences.theme.system"), value: "system" as const },
  { label: t("account.preferences.theme.light"), value: "light" as const },
  { label: t("account.preferences.theme.dark"), value: "dark" as const },
]);

// An example next to each order, from the last day of this year: a day above
// twelve keeps the order readable.
const year = new Date().getFullYear();
const EXAMPLES: Record<Preferences["dateFormat"], string> = {
  DMY: `31/12/${year}`,
  MDY: `12/31/${year}`,
  YMD: `${year}-12-31`,
};
const dateFormatItems = computed(() => [
  { label: `${t("account.preferences.dateFormat.DMY")} (${EXAMPLES.DMY})`, value: "DMY" as const },
  { label: `${t("account.preferences.dateFormat.MDY")} (${EXAMPLES.MDY})`, value: "MDY" as const },
  { label: `${t("account.preferences.dateFormat.YMD")} (${EXAMPLES.YMD})`, value: "YMD" as const },
]);

const nameOrderItems = computed(() => [
  { label: t("account.preferences.nameOrder.WESTERN"), value: "WESTERN" as const },
  { label: t("account.preferences.nameOrder.EASTERN"), value: "EASTERN" as const },
]);

function onSubmit() {
  emit("submit", { ...state.value });
}
</script>

<template>
  <UForm
    :id="id"
    :schema="schema"
    :state="state"
    :validate-on="['change']"
    class="space-y-6"
    @submit="onSubmit"
  >
    <UFormField v-if="shows('locale')" name="locale" :label="t('account.preferences.locale.label')">
      <USelect
        :model-value="state.locale"
        :items="localeItems"
        class="w-full"
        @update:model-value="update.locale"
      />
    </UFormField>

    <UFormField v-if="shows('timeZone')" name="timeZone" :label="t('account.preferences.timeZone.label')">
      <USelectMenu
        :model-value="state.timeZone"
        :items="timeZoneItems"
        value-key="value"
        virtualize
        :search-input="{ placeholder: t('account.preferences.timeZone.search') }"
        class="w-full"
        @update:model-value="update.timeZone"
      >
        <template #empty>
          {{ t("account.preferences.timeZone.empty") }}
        </template>
      </USelectMenu>
    </UFormField>

    <UFormField v-if="shows('theme')" name="theme" :label="t('account.preferences.theme.label')">
      <USelect
        :model-value="state.theme"
        :items="themeItems"
        class="w-full"
        @update:model-value="update.theme"
      />
    </UFormField>

    <UFormField v-if="shows('dateFormat')" name="dateFormat" :label="t('account.preferences.dateFormat.label')">
      <USelect
        :model-value="state.dateFormat"
        :items="dateFormatItems"
        class="w-full"
        @update:model-value="update.dateFormat"
      />
    </UFormField>

    <UFormField v-if="shows('nameOrder')" name="nameOrder" :label="t('account.preferences.nameOrder.label')">
      <USelect
        :model-value="state.nameOrder"
        :items="nameOrderItems"
        class="w-full"
        @update:model-value="update.nameOrder"
      />
    </UFormField>

    <slot name="actions" />
  </UForm>
</template>
