<template>
  <ClientOnly>
    <USelect
      v-model="$colorMode.preference"
      :items="['system', 'light', 'dark']"
    >
      <template #leading="{ modelValue }">
        <UIcon
          class="w-5 h-5"
          :name="icons[modelValue as keyof typeof icons]"
        />
      </template>
    </USelect>
  </ClientOnly>
</template>

<script setup lang="ts">
const icons = {
  system: "i-lucide-monitor",
  light: "i-lucide-sun",
  dark: "i-lucide-moon",
};
</script>
