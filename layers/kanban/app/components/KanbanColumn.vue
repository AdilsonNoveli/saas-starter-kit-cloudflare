<template>
  <div
    class="flex flex-col h-full bg-elevated/40 rounded-lg border border-default shrink-0 shadow-xs select-none transition-all duration-200 overflow-hidden"
    :class="isCollapsed ? 'w-11' : 'w-72'"
  >
    <!-- ===== RECOLHIDA ===== -->
    <template v-if="isCollapsed">
      <div class="flex flex-col items-center gap-2 w-full py-2.5 h-full bg-elevated/60">
        <!-- Botão Expandir -->
        <button
          type="button"
          class="p-1 rounded-md text-muted hover:text-highlighted hover:bg-elevated/50 transition-colors focus:outline-none"
          title="Expand column"
          aria-label="Expand column"
          @click="toggleCollapse"
        >
          <UIcon name="i-lucide-chevron-last" class="size-4" />
        </button>

        <!-- Nome vertical -->
        <span
          class="text-xs font-bold uppercase tracking-wider whitespace-nowrap [writing-mode:vertical-rl] py-2 text-muted"
        >
          {{ column.name }}
        </span>

        <!-- Contador de cards -->
        <span
          class="text-xs font-extrabold tabular-nums bg-default px-1.5 py-0.5 rounded border border-default mt-auto"
        >
          {{ column.cards.length }}
        </span>
      </div>
    </template>

    <!-- ===== EXPANDIDA ===== -->
    <template v-else>
      <!-- Header (componente extraído) -->
      <KanbanColumnHeader
        :name="column.name"
        :card-count="column.cards.length"
        @collapse="toggleCollapse"
      />

      <!-- Sub-header -->
      <div
        class="px-3 py-1.5 bg-elevated/30 border-b border-default/50 flex items-center justify-between text-[11px] text-muted select-none"
      >
        <span>{{ column.cards.length }} card(s)</span>
      </div>

      <!-- Lista de cards (drop zone) -->
      <div
        ref="listEl"
        :data-column-id="column.id"
        class="flex-1 p-2.5 overflow-y-auto flex flex-col gap-2 min-h-0 [scrollbar-gutter:stable] transition-colors duration-150"
        :class="isDropTarget ? 'bg-primary/5 ring-1 ring-inset ring-primary/20' : ''"
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

      <!-- Adicionar card -->
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
          <button
            type="submit"
            class="shrink-0 p-1.5 rounded-md border border-default bg-elevated/60 text-muted hover:text-highlighted hover:bg-elevated transition-colors focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed"
            :disabled="!cardState.title.trim()"
            aria-label="Add card"
          >
            <UIcon name="i-lucide-plus" class="size-4" />
          </button>
        </UForm>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { Ref } from "vue";
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

// ── Drag state partilhado ────────────────────────────────────────────────────
// O KanbanBoard fornece este ref via provide("kanban:draggedCardId").
// Esta coluna é drop target quando existe um card sendo arrastado que não
// pertence a ela (para destacar visualmente a zona de soltura).
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
  } catch {
    // Ignora erros de parse
  }
});

function toggleCollapse() {
  isCollapsed.value = !isCollapsed.value;
  try {
    localStorage.setItem(storageKey.value, JSON.stringify(isCollapsed.value));
  } catch {
    // Sem localStorage
  }
}

// ── SortableJS ───────────────────────────────────────────────────────────────
const listEl = ref<HTMLElement | null>(null);
const cardState = reactive({ title: "" });

// `list` vazio propositalmente: o handler padrão (splice) é sobrescrito abaixo
// e o estado real vem do servidor após cada mutação.
useSortable(listEl, [], {
  group: "kanban-cards",
  animation: 150,
  onUpdate: () => {},
  onStart: (event: SortableEvent) => {
    // Registra qual card está sendo arrastado para que todas as colunas
    // possam exibir o destaque de drop zone.
    const cardId = (event.item as HTMLElement).dataset.cardId;
    if (cardId) draggedCardId.value = cardId;
  },
  onEnd: (event: SortableEvent) => {
    // Limpa o estado de drag independentemente do resultado.
    draggedCardId.value = null;

    const { item, from, to, oldIndex, newIndex } = event;

    // Sortable já moveu o nó no DOM; Vue ainda não reconciliou.
    // Desfaz a mutação para deixar o Vue aplicar o patch correto após refresh.
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
