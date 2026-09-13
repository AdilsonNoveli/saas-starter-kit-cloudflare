<template>
  <div class="flex flex-col h-full overflow-hidden select-none">
    <!-- Top Sub-Header / Board Toolbar -->
    <div
      class="shrink-0 h-14 border-b border-default bg-surface px-4 sm:px-6 flex items-center justify-between gap-3 select-none"
    >
      <div class="flex items-center gap-3 flex-1 min-w-0">
        <!-- Search Input -->
        <div class="relative w-full max-w-xs h-9 shrink-0">
          <UInput
            v-model="searchQuery"
            icon="i-lucide-search"
            placeholder="Search cards..."
            size="sm"
            class="w-full"
            :ui="{ trailing: 'pr-1.5' }"
          >
            <template v-if="searchQuery" #trailing>
              <UButton
                icon="i-lucide-x"
                color="neutral"
                variant="ghost"
                size="xs"
                square
                aria-label="Clear search"
                @click="searchQuery = ''"
              />
            </template>
          </UInput>
        </div>

        <!-- Meta Counters -->
        <div class="hidden sm:flex items-center gap-1.5 text-xs text-muted">
          <span class="rounded bg-elevated/70 px-2 py-0.5 font-semibold text-highlighted border border-default/50 tabular-nums">
            {{ board.columns.length }} column(s)
          </span>
          <span class="rounded bg-elevated/70 px-2 py-0.5 font-semibold text-highlighted border border-default/50 tabular-nums">
            {{ totalCardsCount }} card(s)
          </span>
          <span v-if="searchQuery.trim()" class="text-xs text-primary font-medium">
            (filtering)
          </span>
        </div>
      </div>
    </div>

    <!-- Main Kanban Board Wrapper (Grab to Scroll) -->
    <div
      ref="boardWrapper"
      class="flex-1 overflow-x-auto overflow-y-hidden p-4 cursor-grab active:cursor-grabbing"
      @mousedown="onMouseDown"
    >
      <div class="flex items-start gap-3 h-full min-w-max pb-2">
        <!-- Columns List -->
        <KanbanColumn
          v-for="col in columnsWithFilteredCards"
          :key="col.id"
          :column="col"
          @move="emit('move', $event)"
          @create-card="emit('createCard', $event)"
          @delete-card="emit('deleteCard', $event)"
        />

        <!-- Add Column Card -->
        <div
          class="flex w-72 shrink-0 flex-col rounded-lg border border-dashed border-default bg-elevated/20 p-3 self-start shadow-xs transition-colors hover:border-default/80"
        >
          <div class="flex items-center gap-1.5 mb-2.5 text-xs font-bold uppercase tracking-wider text-muted">
            <UIcon name="i-lucide-columns-3" class="size-3.5" />
            <span>New column</span>
          </div>

          <UForm
            :state="columnState"
            class="flex items-center gap-1.5"
            @submit="submitColumn"
          >
            <UInput
              v-model="columnState.name"
              placeholder="Column title..."
              size="sm"
              class="flex-1"
            />
            <UButton
              type="submit"
              icon="i-lucide-plus"
              color="neutral"
              variant="subtle"
              size="sm"
              square
              :disabled="!columnState.name.trim()"
              aria-label="Add column"
            />
          </UForm>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { KanbanBoardDetail, KanbanColumnItem } from "../../shared/types";

const props = defineProps<{ board: KanbanBoardDetail }>();

const emit = defineEmits<{
  move: [payload: { cardId: string; toColumnId: string; position: number }];
  createCard: [payload: { columnId: string; title: string }];
  createColumn: [name: string];
  deleteCard: [cardId: string];
}>();

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

  // Don't activate grab-to-scroll when clicking on cards, inputs, buttons, etc.
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
