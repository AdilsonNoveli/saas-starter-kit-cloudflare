<template>
  <div
    class="relative h-full overflow-y-auto no-scrollbar text-sm"
    :class="{ 'pr-4': !isMobile }"
  >
    <ul
      v-if="useLevel"
      class="flex flex-col gap-1.5 pb-4 border-b border-zinc-200 dark:border-zinc-800/80"
    >
      <li v-for="link in docs" :key="link.path">
        <UButton
          :to="link.path"
          :class="[
            path.startsWith(link.path)
              ? '!text-primary-500 dark:!text-primary-400 bg-primary-500/10 dark:bg-primary-950/40 font-semibold ring-1 ring-primary-500/30'
              : 'hover:bg-zinc-100 dark:hover:bg-zinc-900/60 text-zinc-600 dark:text-zinc-400',
          ]"
          variant="ghost"
          color="neutral"
          :icon="link.icon"
          class="w-full justify-start rounded-lg transition-all text-sm"
        >
          {{ link.title }}
          <span v-for="(badge, i) in link.navBadges" :key="i">
            <UBadge
              :variant="badge.variant"
              :color="badge.color"
              :size="badge.size ?? 'sm'"
            >
              {{ badge.value }}
            </UBadge>
          </span>
        </UButton>
      </li>
    </ul>

    <DocsSidebarTree
      :links="tree"
      :level="0"
      :class="[useLevel ? 'pt-4' : 'pt-1']"
    />
    <div v-if="!isMobile" class="h-20" />
  </div>
</template>

<script setup lang="ts">
defineProps<{ isMobile: boolean }>();

const navigation = useContentNavigation();
// queryCollectionNavigation("docs") already returns just the docs tree, so
// this is the top-level sidebar list directly — no path-filtering needed.
const docs = computed(() => navigation?.value ?? []);
const {
  docs: {
    sidebar: { useLevel },
  },
} = useAppConfig();

const tree = computed(() => {
  const route = useRoute();
  const path = route.path.split("/");
  if (useLevel) {
    const leveledPath = path.slice(0, 3).join("/");
    const dir = findNavItemByPath(navigation?.value ?? [], leveledPath);
    return dir?.children ?? [];
  }
  return docs.value;
});

const path = computed(() => useRoute().path);
</script>
