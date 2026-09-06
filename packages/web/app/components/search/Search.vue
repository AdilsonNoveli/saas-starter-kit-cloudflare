<template>
  <div>
    <UButton
      icon="i-lucide-search"
      color="neutral"
      variant="outline"
      size="md"
      class="rounded-md px-3 py-1.5 text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:border-zinc-400 dark:hover:border-zinc-600 transition-all cursor-pointer"
      @click="isOpen = true"
    >
      <span class="hidden md:inline font-normal">Search docs...</span>
      <template #trailing>
        <div class="hidden sm:flex items-center gap-1 ml-1.5">
          <UKbd value="Ctrl" size="sm" class="text-[10px] py-0.5 px-1 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400" />
          <UKbd value="K" size="sm" class="text-[10px] py-0.5 px-1 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400" />
        </div>
      </template>
    </UButton>


    <UModal v-model:open="isOpen">
      <template #content>
        <UCommandPalette
          :groups="groups"
          placeholder="Search documentation..."
        />
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
const isOpen = ref(false);

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
    label: "Pages",
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
