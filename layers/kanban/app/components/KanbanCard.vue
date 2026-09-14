<template>
  <div
    class="kanban-card group relative flex flex-col gap-2 rounded-lg border p-2.5 shadow-xs transition-all duration-150 select-none cursor-grab active:cursor-grabbing"
    :class="
      isDragging
        ? 'opacity-40 scale-95 border-dashed border-primary bg-default'
        : 'bg-default border-default hover:border-default/80 hover:-translate-y-0.5 hover:shadow-md'
    "
  >
    <!-- Top Row: Icon + Title + Delete -->
    <div class="flex items-start justify-between gap-1.5 min-w-0">
      <div class="flex items-center gap-1.5 min-w-0 flex-1">
        <UIcon
          name="i-lucide-file-text"
          class="size-3.5 shrink-0 text-dimmed group-hover:text-muted transition-colors"
        />
        <span
          class="truncate text-xs font-bold text-highlighted"
          :title="card.title"
        >
          {{ card.title }}
        </span>
      </div>

      <!-- Delete — visível apenas no hover do card -->
      <button
        type="button"
        class="opacity-0 group-hover:opacity-100 shrink-0 -my-0.5 -mr-0.5 p-1 rounded-md text-muted hover:text-error transition-all focus:outline-none"
        aria-label="Delete card"
        title="Delete card"
        @click.stop="emit('delete', card.id)"
      >
        <UIcon name="i-lucide-trash-2" class="size-3.5" />
      </button>
    </div>

    <!-- Description -->
    <p
      v-if="card.description"
      class="text-xs text-muted line-clamp-3 leading-relaxed"
    >
      {{ card.description }}
    </p>

    <!-- Bottom meta: posição do card na coluna -->
    <div
      class="flex items-center justify-between pt-1 border-t border-default/50 text-[10px] text-muted font-medium"
    >
      <span
        class="rounded border border-default/60 bg-elevated/70 px-1.5 py-0.5 font-bold tabular-nums"
      >
        #{{ card.position + 1 }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Ref } from "vue";
import type { KanbanCardItem } from "../../shared/types";

const props = defineProps<{ card: KanbanCardItem }>();
const emit = defineEmits<{ delete: [cardId: string] }>();

// Injetado pelo KanbanBoard para rastrear qual card está sendo arrastado.
// O inject com fallback garante que o card funcione mesmo fora de um Board.
const draggedCardId = inject<Ref<string | null>>("kanban:draggedCardId", ref(null));
const isDragging = computed(() => draggedCardId.value === props.card.id);
</script>
