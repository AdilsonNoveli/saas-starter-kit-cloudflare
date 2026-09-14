<template>
  <div
    class="flex flex-col h-full rounded border border-default shadow-xs select-none transition-all duration-200 overflow-hidden bg-white"
    :class="isCollapsed ? 'w-11' : 'w-64'"
  >
    <!-- ===== RECOLHIDA ===== -->
    <template v-if="isCollapsed">
      <div
        class="kanban-column-header flex-1 rounded-t flex flex-col items-center gap-2.5 py-2.5 select-none transition-colors"
        :style="headerStyle"
      >
        <!-- Botão Expandir -->
        <button
          type="button"
          class="p-1 rounded hover:bg-white/40 transition-colors focus:outline-none cursor-pointer"
          :title="`Abrir coluna ${column.name}`"
          :aria-label="`Abrir coluna ${column.name}`"
          @click="toggleCollapse"
        >
          <UIcon name="i-lucide-chevron-last" class="size-4" />
        </button>

        <!-- Contador -->
        <span class="text-[10px] font-extrabold tabular-nums leading-none">
          {{ column.cards.length }}
        </span>

        <!-- Nome vertical -->
        <span
          class="text-xs font-bold uppercase tracking-wider whitespace-nowrap [writing-mode:vertical-rl] py-1"
        >
          {{ column.name }}
        </span>
      </div>
    </template>

    <!-- ===== EXPANDIDA ===== -->
    <template v-else>
      <!-- Header com recolher, título, contador, editar e excluir -->
      <KanbanColumnHeader
        :name="column.name"
        :card-count="column.cards.length"
        :position="column.position"
        @collapse="toggleCollapse"
        @rename="emit('updateColumn', { columnId: column.id, name: $event })"
        @delete="emit('deleteColumn', column.id)"
      />

      <!-- Sub-header -->
      <div
        class="px-3 py-1.5 bg-[#f8f8f8]/50 border-b border-default/50 flex items-center justify-between text-[11px] text-muted select-none"
      >
        <span>{{ column.cards.length }} card(s)</span>
      </div>

      <!-- Lista de cards (drop zone) -->
      <div
        ref="listEl"
        :data-column-id="column.id"
        class="flex-1 p-2.5 overflow-y-auto flex flex-col gap-2.5 min-h-0 [scrollbar-gutter:stable] transition-colors duration-150"
        :class="isDropTarget ? 'bg-primary/5 ring-1 ring-inset ring-primary/20' : ''"
      >
        <div
          v-if="column.cards.length === 0"
          class="text-center text-xs text-muted/60 italic py-8 select-none"
        >
          Nenhum card
        </div>

        <div
          v-for="card in column.cards"
          :key="card.id"
          :data-card-id="card.id"
        >
          <KanbanCard :card="card" @delete="emit('deleteCard', $event)" />
        </div>
      </div>

      <!-- Adicionar card -->
      <div class="p-2.5 pt-0 shrink-0 border-t border-default/50 mt-auto bg-white">
        <form
          class="flex items-center gap-1.5 pt-2"
          @submit.prevent="submitCard"
        >
          <input
            v-model="cardState.title"
            type="text"
            placeholder="Adicionar card..."
            class="flex-1 h-8 px-2 border border-default rounded bg-white text-sm text-highlighted placeholder:text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
          />
          <button
            type="submit"
            class="shrink-0 size-8 flex items-center justify-center rounded border border-default bg-[#f8f8f8] text-muted hover:text-highlighted hover:bg-white transition-colors focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            :disabled="!cardState.title.trim()"
            aria-label="Add card"
          >
            <UIcon name="i-lucide-plus" class="size-4" />
          </button>
        </form>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { Ref } from "vue";
import { ref, reactive, inject, computed, onMounted } from "vue";
import type { SortableEvent } from "sortablejs";
import {
  insertNodeAt,
  removeNode,
  useSortable,
} from "@vueuse/integrations/useSortable";
import type { KanbanColumnItem } from "../../shared/types";

const props = defineProps<{ column: KanbanColumnItem }>();

const emit = defineEmits<{
  move: [payload: { cardId: string; toColumnId: string; position: number }];
  createCard: [payload: { columnId: string; title: string }];
  deleteCard: [cardId: string];
  updateColumn: [payload: { columnId: string; name: string }];
  deleteColumn: [columnId: string];
}>();

const CORES_PREDEFINIDAS = [
  "#EC4899",
  "#3B82F6",
  "#F59E0B",
  "#8B5CF6",
  "#06B6D4",
  "#10B981",
  "#EF4444",
  "#6B7280",
];

const headerStyle = computed(() => {
  const cor =
    CORES_PREDEFINIDAS[(props.column.position ?? 0) % CORES_PREDEFINIDAS.length] ||
    "#6B7280";

  return {
    backgroundColor: `color-mix(in srgb, ${cor} 32%, #f8f8f8)`,
    borderColor: `color-mix(in srgb, ${cor} 55%, #e6e6e6)`,
    color: `color-mix(in srgb, ${cor} 65%, #1a1a1a)`,
  };
});

// Drag state compartilhado via provide/inject
const draggedCardId = inject<Ref<string | null>>("kanban:draggedCardId", ref(null));
const isDropTarget = computed(() => {
  if (!draggedCardId.value) return false;
  return !props.column.cards.some((c) => c.id === draggedCardId.value);
});

// ── Colapso ──────────────────────────────────────────────────────────────────
const storageKey = computed(() => `kanban:col-collapsed:${props.column.id}`);
const isCollapsed = ref(false);

onMounted(() => {
  try {
    const saved = localStorage.getItem(storageKey.value);
    if (saved !== null) isCollapsed.value = JSON.parse(saved);
  } catch { /* ignora */ }
});

function toggleCollapse() {
  isCollapsed.value = !isCollapsed.value;
  try {
    localStorage.setItem(storageKey.value, JSON.stringify(isCollapsed.value));
  } catch { /* sem localStorage */ }
}

// ── SortableJS ───────────────────────────────────────────────────────────────
const listEl = ref<HTMLElement | null>(null);
const cardState = reactive({ title: "" });

useSortable(listEl, [], {
  group: "kanban-cards",
  animation: 150,
  onUpdate: () => {},
  onStart: (event: SortableEvent) => {
    const cardId = (event.item as HTMLElement).dataset.cardId;
    if (cardId) draggedCardId.value = cardId;
  },
  onEnd: (event: SortableEvent) => {
    draggedCardId.value = null;
    const { item, from, to, oldIndex, newIndex } = event;
    removeNode(item);
    insertNodeAt(from, item, oldIndex ?? 0);
    const cardId = item.dataset.cardId;
    const toColumnId = (to as HTMLElement).dataset.columnId;
    if (!cardId || !toColumnId) return;
    if (from === to && oldIndex === newIndex) return;
    emit("move", { cardId, toColumnId, position: newIndex ?? 0 });
  },
});

function submitCard() {
  const title = cardState.title.trim();
  if (!title) return;
  emit("createCard", { columnId: props.column.id, title });
  cardState.title = "";
}
</script>
