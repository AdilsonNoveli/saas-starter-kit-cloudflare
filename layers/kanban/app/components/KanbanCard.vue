<template>
  <div
    class="kanban-card group relative flex flex-col gap-2 rounded-lg border border-default bg-default p-2.5 shadow-xs transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md hover:border-default/80 select-none cursor-grab active:cursor-grabbing"
  >
    <!-- Top Row: Icon + Title + Delete action -->
    <div class="flex items-start justify-between gap-1.5 min-w-0">
      <div class="flex items-center gap-1.5 min-w-0 flex-1">
        <UIcon
          name="i-lucide-file-text"
          class="size-3.5 shrink-0 text-dimmed group-hover:text-default transition-colors"
        />
        <span
          class="truncate text-xs font-bold text-highlighted"
          :title="card.title"
        >
          {{ card.title }}
        </span>
      </div>

      <UButton
        icon="i-lucide-trash-2"
        color="neutral"
        variant="ghost"
        size="xs"
        square
        class="opacity-0 group-hover:opacity-100 hover:text-error transition-opacity shrink-0 -my-1 -mr-1"
        aria-label="Delete card"
        title="Delete card"
        @click.stop="emit('delete', card.id)"
      />
    </div>

    <!-- Middle Row: Description if present -->
    <p
      v-if="card.description"
      class="text-xs text-muted line-clamp-3 leading-relaxed"
    >
      {{ card.description }}
    </p>

    <!-- Bottom Row: Meta Badge / Position -->
    <div
      class="flex items-center justify-between pt-1 border-t border-default/50 text-[10px] text-muted font-medium"
    >
      <span
        class="rounded border border-default/60 bg-elevated/70 px-1.5 py-0.5 text-[10px] font-bold tabular-nums"
      >
        #{{ card.position + 1 }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { KanbanCardItem } from "../../shared/types";

defineProps<{ card: KanbanCardItem }>();

const emit = defineEmits<{ delete: [cardId: string] }>();
</script>
