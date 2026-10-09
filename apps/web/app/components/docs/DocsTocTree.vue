<template>
  <ul :class="[level !== 0 && 'pl-4']" class="space-y-1">
    <li v-for="link in links" :key="link.id" class="space-y-1">
      <NuxtLink
        :to="`#${link.id}`"
        class="block text-xs transition-colors duration-200 text-muted hover:text-highlighted"
        :class="[activeHeadings.includes(link.id) && '!text-primary font-medium']"
      >
        {{ link.text }}
      </NuxtLink>

      <DocsTocTree
        v-if="link.children"
        :links="(link.children || []).filter((x) => x.id !== 'hide-toc')"
        :level="level + 1"
      />
    </li>
  </ul>
</template>

<script setup lang="ts">
import type { TocLink } from "@nuxt/content";

defineProps<{
  links: TocLink[];
  level: number;
}>();

const { activeHeadings, updateHeadings } = useScrollspy();

onMounted(() =>
  updateHeadings([
    ...document.querySelectorAll(".docs-content h1"),
    ...document.querySelectorAll(".docs-content h2"),
    ...document.querySelectorAll(".docs-content h3"),
    ...document.querySelectorAll(".docs-content h4"),
  ]),
);
</script>
