<template>
  <div :class="[height, 'flex flex-col gap-2 items-center justify-center']">
    <span
      v-if="props.text"
      class="text-primary text-sm text-center max-w-[60%]"
      >{{ props.text }}</span
    >
    <UIcon
      class="text-primary w-6 h-6 animate-spin"
      name="i-lucide-loader-circle"
    />
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  text?: string;
  height?: string;
}>();
const height = props.height === undefined ? "h-32" : props.height;
</script>
