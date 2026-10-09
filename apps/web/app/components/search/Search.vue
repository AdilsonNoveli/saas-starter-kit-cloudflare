<template>
  <div class="w-full">
    <button
      type="button"
      class="w-full h-12 sm:h-14 rounded-2xl px-4 sm:px-5 text-sm sm:text-base text-muted hover:text-highlighted bg-elevated/70 hover:bg-elevated border border-default hover:border-primary/50 shadow-sm transition-all cursor-pointer flex items-center justify-between group backdrop-blur-sm"
      @click="isOpen = true"
    >
      <div class="flex items-center gap-3.5">
        <UIcon name="i-lucide-search" class="w-5 h-5 text-muted group-hover:text-primary transition-colors shrink-0" />
        <span class="font-normal text-muted group-hover:text-highlighted transition-colors">
          {{ triggerLabel }}
        </span>
      </div>
      <div class="flex items-center gap-1.5 ml-auto shrink-0">
        <UKbd value="Ctrl" size="md" class="text-xs py-1 px-2.5 rounded-lg bg-default border border-default text-muted font-mono" />
        <UKbd value="K" size="md" class="text-xs py-1 px-2.5 rounded-lg bg-default border border-default text-muted font-mono" />
      </div>
    </button>


    <UModal v-model:open="isOpen">
      <template #content>
        <UCommandPalette
          v-model:search-term="searchTerm"
          :groups="groups"
          :placeholder="placeholderLabel"
          :loading="searching"
        />
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
interface SearchProps {
  // Which @nuxt/content collection to search — docs and blog each get their
  // own FTS index and their own trigger/placeholder copy (search.docs.* /
  // search.blog.*), same component either way.
  collection?: "docs" | "blog";
}

const props = withDefaults(defineProps<SearchProps>(), { collection: "docs" });

const isOpen = ref(false);
const { t } = useI18n();

defineShortcuts({
  meta_k: () => {
    isOpen.value = !isOpen.value;
  },
});

const triggerLabel = computed(() => t(`search.${props.collection}.trigger`));
const placeholderLabel = computed(() => t(`search.${props.collection}.placeholder`));

// `searchContent` was removed in @nuxt/content v3; `useSearchCollection` builds
// the full-text index for the collection on the client and exposes `search`.
const { search } = useSearchCollection(props.collection);

// UCommandPalette's `groups[].items` is a static array — there is no
// `groups[].search` callback in its API (that key was silently ignored, which
// is why results never appeared no matter what was typed). The documented
// pattern for async/server-backed results is: bind `v-model:search-term`,
// react to it yourself, and mark the group `ignoreFilter: true` so the
// component renders `items` as-is instead of re-filtering already-filtered
// results with its own built-in Fuse matcher.
const searchTerm = ref("");
const searching = ref(false);
const items = ref<
  { id: string; icon: string; label: string; onSelect: () => void }[]
>([]);

watchDebounced(
  searchTerm,
  async (query) => {
    if (!query) {
      items.value = [];
      return;
    }
    searching.value = true;
    try {
      const results = await search(query);
      items.value = results.map((result) => ({
        id: result.id,
        icon: "i-lucide-file",
        label: [...result.titles, result.title].join(" > "),
        onSelect() {
          isOpen.value = false;
          navigateTo(result.id);
        },
      }));
    } finally {
      searching.value = false;
    }
  },
  { debounce: 200 },
);

// Reopening the palette shouldn't flash the previous query's stale results
// before the user has typed anything new.
watch(isOpen, (open) => {
  if (!open) {
    searchTerm.value = "";
    items.value = [];
  }
});

const groups = computed(() => [
  {
    id: "pages",
    label: t("search.groups.pages"),
    items: items.value,
    ignoreFilter: true,
  },
]);
</script>
