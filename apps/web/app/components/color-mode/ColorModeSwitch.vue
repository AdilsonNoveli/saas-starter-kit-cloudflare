<template>
  <ClientOnly>
    <UButton
      color="neutral"
      variant="ghost"
      :icon="icons[colorMode.preference]"
      :aria-label="$t('nav.colorMode')"
      @click="switchMode"
    />
    <template #fallback>
      <UButton
        color="neutral"
        variant="ghost"
        :icon="icons['dark']"
        :aria-label="$t('nav.colorMode')"
        @click="switchMode"
      />
    </template>
  </ClientOnly>
</template>

<script setup>
const colorMode = useColorMode();
const switchMode = () => {
  const modes = ["system", "light", "dark"];
  colorMode.preference =
    modes[(modes.indexOf(colorMode.preference) + 1) % modes.length];
};
const icons = {
  system: "i-lucide-monitor",
  light: "i-lucide-sun",
  dark: "i-lucide-moon",
};
</script>
