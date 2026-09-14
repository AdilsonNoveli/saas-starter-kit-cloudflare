<template>
  <div class="flex flex-col h-full overflow-hidden select-none bg-white text-highlighted font-sans">
    <!-- Toolbar do board -->
    <div
      class="shrink-0 h-14 border-b border-default bg-white px-4 sm:px-6 flex items-center justify-between gap-3 select-none"
    >
      <div class="flex items-center gap-3 flex-1 min-w-0">
        <!-- Search -->
        <div class="relative w-full max-w-xs h-9 shrink-0">
          <label for="board-search" class="sr-only">Pesquisar</label>
          <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <UIcon name="i-lucide-search" class="w-4 h-4 text-muted" />
          </div>
          <input
            id="board-search"
            v-model="searchQuery"
            type="text"
            class="block w-full h-full pl-9 pr-8 border border-default rounded bg-white text-sm text-highlighted placeholder:text-muted focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
            placeholder="Pesquisar cards..."
          >
          <button
            v-if="searchQuery"
            type="button"
            class="absolute inset-y-0 right-0 pr-2.5 flex items-center text-muted hover:text-highlighted"
            @click="searchQuery = ''"
          >
            <UIcon name="i-lucide-x" class="w-3.5 h-3.5" />
          </button>
        </div>

        <!-- Counters -->
        <div class="hidden sm:flex items-center gap-1.5 text-xs text-muted">
          <span class="rounded bg-[#f8f8f8] px-2 py-0.5 font-semibold text-highlighted border border-default tabular-nums">
            {{ board.columns.length }} coluna(s)
          </span>
          <span class="rounded bg-[#f8f8f8] px-2 py-0.5 font-semibold text-highlighted border border-default tabular-nums">
            {{ totalCardsCount }} card(s)
          </span>
          <span v-if="searchQuery.trim()" class="text-xs text-muted font-medium">
            (filtrando)
          </span>
        </div>
      </div>
    </div>


    <!-- Board: área de scroll lateral (grab-to-scroll) -->
    <div
      ref="boardWrapper"
      class="flex-1 overflow-x-auto overflow-y-hidden p-4 cursor-grab active:cursor-grabbing bg-white"
      @mousedown="onMouseDown"
    >
      <div class="flex items-start gap-2.5 h-full min-w-max pb-2">
        <!-- Colunas -->
        <KanbanColumn
          v-for="col in columnsWithFilteredCards"
          :key="col.id"
          :column="col"
          @move="emit('move', $event)"
          @create-card="emit('createCard', $event)"
          @delete-card="emit('deleteCard', $event)"
        />

        <!-- Adicionar nova coluna -->
        <div
          class="flex w-64 shrink-0 flex-col rounded border border-dashed border-default bg-white p-3 self-start shadow-xs transition-colors hover:border-[--color-night-400]"
        >
          <div class="flex items-center gap-1.5 mb-2.5 text-xs font-bold uppercase tracking-wider text-muted">
            <UIcon name="i-lucide-columns-3" class="size-3.5" />
            <span>Nova coluna</span>
          </div>

          <form
            class="flex items-center gap-1.5"
            @submit.prevent="submitColumn"
          >
            <input
              v-model="columnState.name"
              type="text"
              placeholder="Nome da coluna..."
              class="flex-1 h-8 px-2 border border-default rounded bg-white text-sm text-highlighted placeholder:text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
            >
            <button
              type="submit"
              class="shrink-0 size-8 flex items-center justify-center rounded border border-default bg-[#f8f8f8] text-muted hover:text-highlighted hover:bg-white transition-colors focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed"
              :disabled="!columnState.name.trim()"
              aria-label="Add column"
            >
              <UIcon name="i-lucide-plus" class="size-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { KanbanBoardDetail, KanbanColumnItem } from "../../shared/types";
import { provide, ref, computed, reactive, onUnmounted } from "vue";

const props = defineProps<{ board: KanbanBoardDetail }>();

const emit = defineEmits<{
  move: [payload: { cardId: string; toColumnId: string; position: number }];
  createCard: [payload: { columnId: string; title: string }];
  createColumn: [name: string];
  deleteCard: [cardId: string];
}>();

// Estado de drag partilhado com KanbanColumn e KanbanCard via provide/inject.
const draggedCardId = ref<string | null>(null);
provide("kanban:draggedCardId", draggedCardId);

const searchQuery = ref("");
const columnState = reactive({ name: "" });

const totalCardsCount = computed(() =>
  props.board.columns.reduce((sum, col) => sum + col.cards.length, 0),
);

// Filter cards inside columns according to the search query
const columnsWithFilteredCards = computed<KanbanColumnItem[]>(() => {
  const query = searchQuery.value.trim().toLowerCase();
  if (!query) return props.board.columns;

  return props.board.columns.map((col) => ({
    ...col,
    cards: col.cards.filter(
      (card) =>
        card.title.toLowerCase().includes(query) ||
        (card.description && card.description.toLowerCase().includes(query)),
    ),
  }));
});

function submitColumn() {
  const name = columnState.name.trim();
  if (!name) return;
  emit("createColumn", name);
  columnState.name = "";
}

// === Grab to Scroll (arraste lateral livre do quadro) ===
const boardWrapper = ref<HTMLElement | null>(null);
const isDown = ref(false);
const startX = ref(0);
const scrollLeftStart = ref(0);

function onMouseDown(e: MouseEvent): void {
  const target = e.target as HTMLElement;

  if (
    target.closest(".kanban-card") ||
    target.closest("button") ||
    target.closest("input") ||
    target.closest("textarea") ||
    target.closest("select") ||
    target.closest("a")
  ) {
    return;
  }

  isDown.value = true;
  const wrapper = boardWrapper.value;
  if (!wrapper) return;

  startX.value = e.pageX - wrapper.offsetLeft;
  scrollLeftStart.value = wrapper.scrollLeft;

  window.addEventListener("mousemove", onMouseMove);
  window.addEventListener("mouseup", onMouseUp);
}

function onMouseMove(e: MouseEvent): void {
  if (!isDown.value) return;
  const wrapper = boardWrapper.value;
  if (!wrapper) return;

  const x = e.pageX - wrapper.offsetLeft;
  const walk = (x - startX.value) * 1.5;
  wrapper.scrollLeft = scrollLeftStart.value - walk;
}

function onMouseUp(): void {
  isDown.value = false;
  window.removeEventListener("mousemove", onMouseMove);
  window.removeEventListener("mouseup", onMouseUp);
}

onUnmounted(() => {
  window.removeEventListener("mousemove", onMouseMove);
  window.removeEventListener("mouseup", onMouseUp);
});
</script>
