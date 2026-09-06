<template>
  <h2
    :id
    class="scroll-m-20 border-b border-gray-200 dark:border-gray-800 pb-2 text-3xl font-semibold tracking-tight transition-colors [&:not(:first-child)]:mt-10"
  >
    <NuxtLink v-if="id && generate" :href="`#${id}`">
      <slot />
    </NuxtLink>
    <slot v-else />
  </h2>
</template>

<script setup lang="ts">
const { id } = defineProps<{ id?: string }>();

const { headings } = useRuntimeConfig().public.mdc;
const generate = computed(() => id && headings?.anchorLinks?.h2);
</script>
