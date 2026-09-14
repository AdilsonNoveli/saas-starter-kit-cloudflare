<template>
  <div
    class="shrink-0 px-3 py-2.5 flex items-center justify-between gap-2 border-b border-default bg-[#f8f8f8] select-none rounded-t"
  >
    <div class="flex items-center gap-2 min-w-0 flex-1">
      <span class="text-xs font-bold uppercase tracking-wider truncate text-highlighted">
        {{ name }}
      </span>
      <span
        class="text-xs font-extrabold tabular-nums bg-white px-1.5 py-0.5 rounded border border-default shrink-0"
      >
        {{ cardCount }}
      </span>
    </div>

    <div class="flex items-center gap-1 shrink-0">
      <button
        type="button"
        class="p-1 rounded text-muted hover:text-highlighted hover:bg-white transition-colors focus:outline-none"
        title="Collapse column"
        aria-label="Collapse column"
        @click="emit('collapse')"
      >
        <UIcon name="i-lucide-chevron-first" class="size-4" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{ name: string; cardCount: number }>();
const emit = defineEmits<{ collapse: [] }>();
</script>
