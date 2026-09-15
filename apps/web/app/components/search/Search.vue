<template>
  <div>
    <UButton
      icon="i-lucide-search"
      color="neutral"
      variant="outline"
      size="md"
      class="h-9 rounded-md px-3 text-xs sm:text-sm text-muted hover:text-highlighted hover:border-accented transition-all cursor-pointer"
      @click="isOpen = true"
    >
      <span class="hidden md:inline font-normal">{{ $t("search.trigger") }}</span>
      <template #trailing>
        <div class="hidden sm:flex items-center gap-1 ml-1.5">
          <UKbd value="Ctrl" size="sm" class="text-[10px] py-0.5 px-1 rounded bg-elevated text-muted" />
          <UKbd value="K" size="sm" class="text-[10px] py-0.5 px-1 rounded bg-elevated text-muted" />
        </div>
      </template>
    </UButton>


    <UModal v-model:open="isOpen">
      <template #content>
        <UCommandPalette
          :groups="groups"
          :placeholder="$t('search.placeholder')"
        />
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
const isOpen = ref(false);
const { t } = useI18n();

defineShortcuts({
  meta_k: () => {
    isOpen.value = !isOpen.value;
  },
});

// `searchContent` was removed in @nuxt/content v3; `useSearchCollection` builds
// the full-text index for the collection on the client and exposes `search`.
const { search } = useSearchCollection("docs");

const groups = computed(() => [
  {
    id: "pages",
    label: t("search.groups.pages"),
    items: [],
    search: async (q: string) => {
      const results = await search(q);
      return results.map((result) => ({
        id: result.id,
        icon: "i-lucide-file",
        label: [...result.titles, result.title].join(" > "),
        onSelect() {
          isOpen.value = false;
          navigateTo(result.id);
        },
      }));
    },
  },
]);
</script>
