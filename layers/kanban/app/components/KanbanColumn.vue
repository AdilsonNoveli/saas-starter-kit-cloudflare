<template>
  <div class="flex w-72 shrink-0 flex-col gap-3 rounded-lg bg-elevated/50 p-3">
    <div class="flex items-center justify-between gap-2">
      <h3 class="text-sm font-semibold truncate">
        {{ column.name }}
      </h3>
      <UBadge color="neutral" variant="subtle" size="sm">
        {{ column.cards.length }}
      </UBadge>
    </div>

    <div
      ref="listEl"
      :data-column-id="column.id"
      class="flex min-h-12 flex-col gap-2"
    >
      <div v-for="card in column.cards" :key="card.id" :data-card-id="card.id">
        <KanbanCard :card="card" @delete="emit('deleteCard', $event)" />
      </div>
    </div>

    <UForm
      :state="cardState"
      class="flex items-center gap-2"
      @submit="submitCard"
    >
      <UInput
        v-model="cardState.title"
        placeholder="Add a card"
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
        :disabled="!cardState.title.trim()"
        aria-label="Add card"
      />
    </UForm>
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
