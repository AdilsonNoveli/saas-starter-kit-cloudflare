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
          {{ $t("search.placeholder") }}
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
