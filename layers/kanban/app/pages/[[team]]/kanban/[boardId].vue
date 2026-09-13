<template>
  <UDashboardPanel id="kanban-board">
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
        v-if="status === 'pending'"
        class="flex justify-center py-12 text-muted"
      >
        <UIcon name="i-lucide-loader-circle" class="size-6 animate-spin" />
      </div>

      <KanbanBoard
        v-else-if="board"
        :board="board"
        @move="moveCard"
        @create-card="createCard"
        @create-column="createColumn"
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
const toast = useToast();
const currentTeam = useCurrentTeam();
const baseRoute = computed(() => `/${currentTeam.value?.slug ?? ""}`);
const boardId = computed(() => String(route.params.boardId ?? ""));

const kanban = useKanban();
const {
  data: board,
  status,
  refresh,
} = await kanban.useBoard(() => boardId.value);

/**
 * Every mutation refetches instead of patching local state. The server owns
 * card ordering (it renumbers a whole column on every move), so a local splice
 * would only be a second, divergent opinion about the same list.
 */
async function run(action: () => Promise<unknown>, failureTitle: string) {
  try {
    await action();
    await refresh();
  } catch (error: any) {
    toast.add({
      title: failureTitle,
      description: error?.message || "Something went wrong",
      color: "error",
      icon: "i-lucide-x",
    });
  }
}

function moveCard(payload: {
  cardId: string;
  toColumnId: string;
  position: number;
}) {
  return run(() => kanban.moveCard(payload), "Failed to move card");
}

function createCard(payload: { columnId: string; title: string }) {
  return run(
    () => kanban.createCard(payload.columnId, payload.title),
    "Failed to create card",
  );
}

function createColumn(name: string) {
  return run(
    () => kanban.createColumn(boardId.value, name),
    "Failed to create column",
  );
}

function deleteCard(cardId: string) {
  return run(() => kanban.deleteCard(cardId), "Failed to delete card");
}
</script>
