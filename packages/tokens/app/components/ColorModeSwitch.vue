<script setup lang="ts">
// The theme button of apps/web and apps/app (SPEC-0010, DEC-004): one code for
// both, served by the @nuxfire/tokens layer. It only switches the theme; an app
// that keeps the choice elsewhere (apps/app saves it to the person's
// preferences) listens to `change`.
type ColorModePreference = "system" | "light" | "dark";

defineProps<{
  /** Accessible name of the button, from the locale files of the app that renders it. */
  label: string;
}>();

const emit = defineEmits<{ change: [preference: ColorModePreference] }>();

const MODES: readonly ColorModePreference[] = ["system", "light", "dark"];
const ICONS: Record<ColorModePreference, string> = {
  system: "i-ph-desktop-duotone",
  light: "i-ph-sun-duotone",
  dark: "i-ph-moon-duotone",
};

const colorMode = useColorMode();
const current = computed<ColorModePreference>(
  () => MODES.find((mode) => mode === colorMode.preference) ?? "system",
);

function switchMode() {
  const next = MODES[(MODES.indexOf(current.value) + 1) % MODES.length] ?? "system";
  colorMode.preference = next;
  emit("change", next);
}
</script>

<template>
  <ClientOnly>
    <UButton
      color="neutral"
      variant="ghost"
      :icon="ICONS[current]"
      :aria-label="label"
      @click="switchMode"
    />
    <template #fallback>
      <UButton
        color="neutral"
        variant="ghost"
        :icon="ICONS.dark"
        :aria-label="label"
        @click="switchMode"
      />
    </template>
  </ClientOnly>
</template>
