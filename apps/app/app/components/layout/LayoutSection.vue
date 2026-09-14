<template>
  <div
    :class="[
      'rounded-lg container mx-auto max-w-4xl my-4 p-4 bg-elevated/40',
      hasBorder ? 'ring-1 ring-default' : '',
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
    hasBorder: true,
  },
);
</script>
