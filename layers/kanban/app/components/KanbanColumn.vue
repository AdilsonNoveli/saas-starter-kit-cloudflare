<template>
  <div
    class="flex flex-col h-full bg-elevated/40 rounded-lg border border-default shrink-0 shadow-xs select-none transition-all duration-200 overflow-hidden"
    :class="isCollapsed ? 'w-11' : 'w-72'"
  >
    <!-- Collapsed Column View -->
    <template v-if="isCollapsed">
      <div class="flex flex-col items-center gap-3 w-full py-2.5 h-full bg-elevated/60">
        <UButton
          icon="i-lucide-chevron-last"
          color="neutral"
          variant="ghost"
          size="xs"
          square
          title="Expand column"
          aria-label="Expand column"
          @click="toggleCollapse"
        />

        <span
          class="text-xs font-bold uppercase tracking-wider whitespace-nowrap [writing-mode:vertical-rl] py-2 text-muted"
        >
          {{ column.name }}
        </span>

        <span
          class="text-xs font-extrabold tabular-nums bg-default px-1.5 py-0.5 rounded border border-default mt-auto"
        >
          {{ column.cards.length }}
        </span>
      </div>
    </template>

    <!-- Expanded Column View -->
    <template v-else>
      <!-- Column Header -->
      <div
        class="shrink-0 px-3 py-2.5 flex items-center justify-between gap-2 border-b border-default bg-elevated/80 select-none rounded-t-lg"
      >
        <div class="flex items-center gap-2 min-w-0 flex-1">
          <span class="text-xs font-bold uppercase tracking-wider truncate text-highlighted">
            {{ column.name }}
          </span>
          <span
            class="text-xs font-extrabold tabular-nums bg-default px-1.5 py-0.5 rounded border border-default shrink-0"
          >
            {{ column.cards.length }}
          </span>
        </div>

        <div class="flex items-center gap-1 shrink-0">
          <UButton
            icon="i-lucide-chevron-first"
            color="neutral"
            variant="ghost"
            size="xs"
            square
            title="Collapse column"
            aria-label="Collapse column"
            @click="toggleCollapse"
          />
        </div>
      </div>

      <!-- Column Sub-header -->
      <div
        class="px-3 py-1.5 bg-elevated/30 border-b border-default/50 flex items-center justify-between text-[11px] text-muted select-none"
      >
        <span>{{ column.cards.length }} card(s)</span>
      </div>

      <!-- Column Cards List -->
      <div
        ref="listEl"
        :data-column-id="column.id"
        class="flex-1 p-2.5 overflow-y-auto flex flex-col gap-2 min-h-0 [scrollbar-gutter:stable] transition-colors"
      >
        <div
          v-if="column.cards.length === 0"
          class="text-center text-xs text-muted/60 italic py-8 select-none"
        >
          No cards
        </div>

        <div
          v-for="card in column.cards"
          :key="card.id"
          :data-card-id="card.id"
        >
          <KanbanCard :card="card" @delete="emit('deleteCard', $event)" />
        </div>
      </div>

      <!-- Add Card Form -->
      <div class="p-2.5 pt-0 shrink-0">
        <UForm
          :state="cardState"
          class="flex items-center gap-1.5"
          @submit="submitCard"
        >
          <UInput
            v-model="cardState.title"
            placeholder="Add a card..."
            size="xs"
            class="flex-1"
          />
          <UButton
            type="submit"
            icon="i-lucide-plus"
            color="neutral"
            variant="subtle"
            size="xs"
            square
            :disabled="!cardState.title.trim()"
            aria-label="Add card"
          />
        </UForm>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
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
}>();

const listEl = ref<HTMLElement | null>(null);
const cardState = reactive({ title: "" });

// Collapse state with local storage persistence
const storageKey = computed(() => `kanban:col-collapsed:${props.column.id}`);
const isCollapsed = ref(false);

onMounted(() => {
  try {
    const saved = localStorage.getItem(storageKey.value);
    if (saved !== null) {
      isCollapsed.value = JSON.parse(saved);
    }
  } catch {
    // Ignore storage parse errors
  }
});

function toggleCollapse() {
  isCollapsed.value = !isCollapsed.value;
  try {
    localStorage.setItem(storageKey.value, JSON.stringify(isCollapsed.value));
  } catch {
    // Ignore storage errors
  }
}

// The `list` argument is deliberately an empty array: it exists only for the
// library's default `onUpdate`, which splices the array it is handed — and that
// handler is overridden below precisely so nothing mutates the list Vue renders
// from. `props.column.cards` stays read-only as far as Sortable is concerned.
useSortable(listEl, [], {
  group: "kanban-cards",
  animation: 150,
  // Suppresses the default handler, which would splice the array Vue is
  // rendering from. Server state is the single source of truth here: the
  // parent runs the mutation and refetches the board.
  onUpdate: () => {},
  onEnd: (event: SortableEvent) => {
    const { item, from, to, oldIndex, newIndex } = event;

    // Sortable has already moved the DOM node by the time this fires. Vue
    // owns this subtree, so put the node back where it was before Vue's next
    // patch runs against a tree it never produced — the same undo the
    // library's own `moveArrayElement` performs.
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
