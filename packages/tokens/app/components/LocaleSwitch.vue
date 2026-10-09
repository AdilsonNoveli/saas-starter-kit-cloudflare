<script setup lang="ts">
import type { DropdownMenuItem } from "@nuxt/ui";
import type { Locale } from "vue-i18n";

// The language menu of apps/web and apps/app (SPEC-0010, DEC-004): one code
// for both, served by the @nuxfire/tokens layer. The apps differ only in where
// a language lives, so that comes in as a prop: apps/web (prefixed URLs)
// passes `switchLocalePath`, apps/app (`no_prefix`) passes nothing and the
// switch is `setLocale` alone. Saving the choice is the app's own business:
// it listens to `change`.
const props = defineProps<{
  /** Accessible name of the button, from the locale files of the app that renders it. */
  label: string;
  /** The address of the page in each language, when languages have their own URLs. */
  to?: (code: Locale) => string;
}>();

const emit = defineEmits<{ change: [code: Locale] }>();

const { locale, locales, setLocale } = useI18n();

const currentCode = computed(() => (locale.value.split("-")[0] ?? locale.value).toUpperCase());

const items = computed<DropdownMenuItem[]>(() =>
  locales.value.map((item) => ({
    label: item.name ?? item.code,
    to: props.to?.(item.code),
    icon: locale.value === item.code ? "i-ph-check-duotone" : undefined,
    async onSelect() {
      await setLocale(item.code);
      emit("change", item.code);
    },
  })),
);
</script>

<template>
  <UDropdownMenu :items="items">
    <UButton
      color="neutral"
      variant="ghost"
      size="sm"
      icon="i-ph-translate-duotone"
      :label="currentCode"
      :aria-label="`${currentCode} - ${label}`"
      class="cursor-pointer font-semibold tracking-wide"
    />
  </UDropdownMenu>
</template>
