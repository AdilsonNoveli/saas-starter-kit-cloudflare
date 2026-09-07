<template>
  <li>
    <div v-if="link.children">
      <template v-if="folderStyle === 'group'">
        <div
          class="mt-2 flex h-8 items-center gap-2 rounded-md px-2 font-semibold text-foreground/70 outline-none"
        >
          <UIcon v-if="link.icon" :name="link.icon" class="w-5 h-5" />
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
        </div>
        <DocsSidebarTree :links="link.children" :level="level" />
      </template>
      <template v-else>
        <UAccordion
          :default-open="isOpen"
          color="neutral"
          variant="ghost"
          size="sm"
          :items="[{}]"
          :ui="{ item: 'pt-1' }"
        >
          <template #default>
            <UButton
              :icon="link.icon"
              color="neutral"
              variant="ghost"
              class="w-full text-zinc-700 dark:text-zinc-300 font-medium hover:bg-zinc-100 dark:hover:bg-zinc-900/60"
            >
              <span class="truncate">{{ link.title }}</span>
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
          </template>
          <template #body>
            <DocsSidebarTree :links="link.children || []" :level="level + 1" />
          </template>
        </UAccordion>
      </template>
    </div>
    <UButton
      v-else
      :icon="link.icon"
      class="justify-start w-full text-xs font-normal transition-all rounded-md"
      :class="[
        isActive
          ? '!text-primary-600 dark:!text-primary-400 bg-primary-500/10 dark:bg-primary-950/40 font-semibold ring-1 ring-primary-500/25'
          : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-900/50',
      ]"
      block
      variant="ghost"
      color="neutral"
      :to="link.path"
    >
      <span class="truncate">
        {{ link.title }}
      </span>
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
</template>


<script setup lang="ts">
import type { DocsNavigationItem } from "~/composables/use-content-navigation";

const { link, level } = defineProps<{
  link: DocsNavigationItem;
  level: number;
}>();

const {
  docs: {
    sidebar: { collapse, collapseLevel, folderStyle: defaultFolderStyle },
  },
} = useAppConfig();

const collapsed = useCollapsedMap();
const isOpen = ref(collapsed.value.get(link.path) || defaultOpen());

function defaultOpen() {
  if (link.collapse !== undefined) return !link.collapse;

  return level < collapseLevel && !collapse;
}

watch(isOpen, (v) => {
  collapsed.value.set(link.path, v);
});
const isActive = computed(() => link.path === useRoute().path);

const folderStyle = computed(() => link.sidebar?.style ?? defaultFolderStyle);
</script>
