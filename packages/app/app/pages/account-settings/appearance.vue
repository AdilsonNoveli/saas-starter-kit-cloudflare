<template>
  <div class="space-y-6">
    <UPageCard title="Theme" description="Choose how NuxFire looks on this device." variant="subtle">
      <div class="grid grid-cols-3 gap-3">
        <button
          v-for="preference in themePreferences"
          :key="preference.value"
          type="button"
          class="relative flex flex-col items-center gap-2 rounded-lg p-4 ring transition-colors cursor-pointer"
          :class="
            colorMode.preference === preference.value
              ? 'ring-primary bg-primary/10 text-primary'
              : 'ring-default hover:ring-accented text-muted hover:text-highlighted'
          "
          @click="colorMode.preference = preference.value"
        >
          <UIcon
            v-if="colorMode.preference === preference.value"
            name="i-lucide-check"
            class="absolute top-2 right-2 size-4"
          />
          <UIcon :name="preference.icon" class="size-6" />
          <span class="text-sm font-medium">{{ preference.label }}</span>
        </button>
      </div>
    </UPageCard>

    <UPageCard title="Language" description="Choose the language used across NuxFire." variant="subtle">
      <div class="flex flex-col gap-1">
        <button
          v-for="item in locales"
          :key="item.code"
          type="button"
          class="flex items-center justify-between gap-3 px-3 py-2 rounded-md transition-colors cursor-pointer"
          :class="
            locale === item.code
              ? 'bg-primary/10 text-primary font-medium'
              : 'hover:bg-elevated text-default'
          "
          @click="setLocale(item.code)"
        >
          <span class="text-sm">{{ item.name ?? item.code }}</span>
          <UIcon v-if="locale === item.code" name="i-lucide-check" class="size-4" />
        </button>
      </div>
    </UPageCard>
  </div>
</template>

<script setup lang="ts">
const colorMode = useColorMode();
const { locale, locales, setLocale } = useI18n();

const themePreferences = [
  { value: "light" as const, label: "Light", icon: "i-lucide-sun" },
  { value: "dark" as const, label: "Dark", icon: "i-lucide-moon" },
  { value: "system" as const, label: "System", icon: "i-lucide-monitor" },
];
</script>
