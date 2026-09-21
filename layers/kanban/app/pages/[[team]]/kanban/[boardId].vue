<template>
  <UDashboardPanel
    id="kanban-board"
    :ui="{
      root: 'h-svh max-h-svh overflow-hidden flex flex-col',
      body: 'flex-1 overflow-hidden p-0 gap-0 sm:p-0 sm:gap-0',
    }"
  >
    <template #header>
      <UDashboardNavbar :title="board?.name ?? 'Board'">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <UButton
            :to="`${baseRoute}/kanban`"
            label="All boards"
            icon="i-lucide-arrow-left"
            color="neutral"
            variant="ghost"
          />
          <AccountUserDropdown collapsed size="md" />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div
        v-if="showInitialLoader"
        class="flex flex-1 items-center justify-center py-12 text-muted"
      >
        <UIcon name="i-lucide-loader-circle" class="size-6 animate-spin" />
      </div>

      <KanbanBoard
        v-else-if="board"
        :board="board"
        class="flex-1 h-full"
        @move="moveCard"
        @create-card="createCard"
        @create-column="createColumn"
        @update-column="updateColumn"
        @delete-column="deleteColumn"
        @delete-card="deleteCard"
      />
    </template>
  </UDashboardPanel>
</template>

<script setup lang="ts">
definePageMeta({
  layout: "dashboard",
});

const route = useRoute();
const notification = useNotification();
const currentTeam = useCurrentTeam();
const baseRoute = computed(() => `/${currentTeam.value?.slug ?? ""}`);
const boardId = computed(() => String(route.params.boardId ?? ""));

const kanban = useKanban();
const {
  data: board,
  status,
  refresh,
} = await kanban.useBoard(() => boardId.value);

// Derived from the query result itself (full DB rows, e.g. with
// `createdAt`/`updatedAt`) rather than the leaner `shared/types` interfaces,
// which only describe the shape components need — splicing one of those into
// this array would silently drop fields the real data carries.
type BoardData = NonNullable<typeof board.value>;
type CardData = BoardData["columns"][number]["cards"][number];

// Only the very first load (no data yet) blanks the panel for a spinner.
// Every later refetch — triggered after each mutation below — happens with
// the board still on screen: hiding it on `status === 'pending'` unmounted
// and remounted the whole board on every single card move, which is the
// "white flash" this guards against.
const showInitialLoader = computed(
  () => status.value === "pending" && !board.value,
);

/**
 * Every mutation refetches instead of patching local state. The server owns
 * card ordering (it renumbers a whole column on every move), so a local splice
 * would only be a second, divergent opinion about the same list. `refresh()`
 * always runs, success or failure, so a rejected mutation reconciles the view
 * with the server instead of leaving it stuck on an optimistic guess.
 */
async function run(action: () => Promise<unknown>, failureTitle: string) {
  try {
    await action();
  } catch (error: any) {
    notification.error(failureTitle, error?.message || "Something went wrong");
  } finally {
    await refresh();
  }
}

/**
 * Applies the drop locally before the network round-trip. `KanbanColumn`'s
 * sortable handler reverts its own DOM move immediately (so Vue stays the
 * single source of truth for card order) and relies on a reactive update to
 * redraw the card in its new slot — without this, that redraw only happened
 * once `refresh()` returned, so every drop visibly snapped back to its
 * origin before jumping to its destination a moment later.
 */
function applyOptimisticMove(payload: {
  cardId: string;
  toColumnId: string;
  position: number;
}) {
  const current = board.value;
  if (!current) return;

  const columns = current.columns.map((col) => ({ ...col, cards: [...col.cards] }));
  let movedCard: CardData | undefined;

  for (const col of columns) {
    const index = col.cards.findIndex((c) => c.id === payload.cardId);
    if (index !== -1) {
      [movedCard] = col.cards.splice(index, 1);
      break;
    }
  }

  const targetColumn = columns.find((col) => col.id === payload.toColumnId);
  if (!movedCard || !targetColumn) return;

  const position = Math.min(payload.position, targetColumn.cards.length);
  targetColumn.cards.splice(position, 0, {
    ...movedCard,
    columnId: payload.toColumnId,
  });

  for (const col of columns) {
    col.cards.forEach((card, index) => {
      card.position = index;
    });
  }

  board.value = { ...current, columns };
}

function moveCard(payload: {
  cardId: string;
  toColumnId: string;
  position: number;
}) {
  applyOptimisticMove(payload);
  return run(() => kanban.moveCard(payload), "Error moving card");
}

function createCard(payload: { columnId: string; title: string }) {
  return run(
    () => kanban.createCard(payload.columnId, payload.title),
    "Error creating card",
  );
}

function createColumn(name: string) {
  return run(
    () => kanban.createColumn(boardId.value, name),
    "Error creating column",
  );
}

function updateColumn(payload: { columnId: string; name: string }) {
  return run(
    () => kanban.updateColumn(payload.columnId, payload.name),
    "Error renaming column",
  );
}

function deleteColumn(columnId: string) {
  return run(
    () => kanban.deleteColumn(columnId),
    "Error deleting column",
  );
}

function deleteCard(cardId: string) {
  return run(() => kanban.deleteCard(cardId), "Error deleting card");
}
</script>
