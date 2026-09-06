<template>
  <ul
    class="flex flex-col gap-1 py-1"
    :class="[
      level > 0 &&
        'mx-3.5 border-l border-gray-200 dark:border-gray-800 px-2.5',
    ]"
  >
    <template
      v-for="link in links.filter((l) => !l.hide || l.children)"
      :key="link.path"
    >
      <DocsSidebarTreeItem :link="link" :level="level" />
    </template>
  </ul>
</template>

<script setup lang="ts">
import type { DocsNavigationItem } from "~/composables/use-content-navigation";

defineProps<{
  links: DocsNavigationItem[];
  level: number;
}>();
</script>
