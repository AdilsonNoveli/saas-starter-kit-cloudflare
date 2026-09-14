<template>
  <div
    :class="[
      'container mx-auto max-w-5xl py-16 px-4 md:px-8',
      props.class,
    ]"
  >
    <slot />
  </div>
</template>

<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    class?: string;
    hasBorder?: boolean;
  }>(),
  {
    class: "",
    hasBorder: false,
  },
);
</script>
