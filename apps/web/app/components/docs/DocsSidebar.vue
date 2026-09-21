<template>
  <div
    class="relative h-full overflow-y-auto no-scrollbar text-sm"
    :class="{ 'pr-4': !isMobile }"
  >
    <ul
      v-if="useLevel"
      class="flex flex-col gap-1.5 pb-4 border-b border-default"
    >
      <li v-for="link in docs" :key="link.path">
        <UButton
          :to="link.path"
          :class="[
            path.startsWith(link.path)
              ? '!text-primary bg-primary/10 font-semibold ring-1 ring-primary/30'
              : 'hover:bg-elevated text-muted',
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

    <!-- Sidebar CTA to Pricing -->
    <div class="mt-6 pt-4 border-t border-default">
      <div class="p-3.5 rounded-xl border border-primary/25 bg-gradient-to-br from-primary/10 via-elevated to-transparent space-y-2.5">
        <div class="flex items-center gap-1.5 text-xs font-bold text-primary">
          <UIcon name="i-lucide-package-check" class="w-4 h-4 shrink-0" />
          <span>{{ $t("docs.sidebar.badge") }}</span>
        </div>
        <p class="text-xs text-muted leading-snug">
          {{ $t("docs.sidebar.description") }}
        </p>
        <NuxtLink
          :to="`${localePath('/')}#pricing`"
          class="inline-flex items-center justify-center w-full py-2 px-3 rounded-lg text-xs font-bold uppercase tracking-wider bg-success hover:bg-success/90 text-night-950 shadow-sm transition-all duration-150 active:scale-95 text-center gap-1.5 whitespace-nowrap"
        >
          <span>{{ $t("docs.sidebar.cta") }}</span>
          <UIcon name="i-lucide-arrow-right" class="w-3.5 h-3.5 shrink-0" />
        </NuxtLink>
      </div>
    </div>

    <div v-if="!isMobile" class="h-10" />
  </div>
</template>

<script setup lang="ts">
defineProps<{ isMobile: boolean }>();

const localePath = useLocalePath();
const navigation = useContentNavigation();
// queryCollectionNavigation("docs") always wraps the tree in one synthetic
// root node for the collection itself (path "/docs"). Its own children mix
// two different things: the collection's index page (content/docs/0.index.md,
// same path as the root) and real product folders (e.g. "SaaS Starter Kit").
// The index page is already what "/docs" itself renders — showing it again
// as a pill here would just repeat the page's own title. And with a single
// product, a pill row containing only that one always-active item has no
// navigational value — it can't be switched away from — so it's hidden until
// there's a real choice to make (a second product folder).
const docs = computed(() => {
  const root = navigation?.value?.[0];
  if (!root) return [];
  const products = (root.children ?? []).filter(
    (item) => item.path !== root.path,
  );
  return products.length > 1 ? products : [];
});
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
