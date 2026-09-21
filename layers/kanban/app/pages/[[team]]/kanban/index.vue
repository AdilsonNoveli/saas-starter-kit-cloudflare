<template>
  <UDashboardPanel id="kanban-boards">
    <template #header>
      <UDashboardNavbar title="Kanban">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <AccountUserDropdown collapsed size="md" />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div
        v-if="showInitialLoader"
        class="flex justify-center py-12 text-muted"
      >
        <UIcon name="i-lucide-loader-circle" class="size-6 animate-spin" />
      </div>

      <div v-else class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <button
          type="button"
          class="flex flex-col items-center justify-center gap-2 min-h-[164px] rounded-lg border-2 border-dashed border-default hover:border-accented text-dimmed hover:text-default transition-colors cursor-pointer"
          @click="showCreateModal = true"
        >
          <UIcon name="i-lucide-circle-plus" class="size-8" />
          <span class="text-sm font-medium">New board</span>
        </button>

        <NuxtLink
          v-for="board in boards"
          :key="board.id"
          :to="`${baseRoute}/kanban/${board.id}`"
          class="group relative flex flex-col justify-between gap-4 min-h-[164px] rounded-lg bg-elevated ring ring-default hover:ring-accented p-5 transition-colors"
        >
          <UDropdownMenu
            :items="boardMenuItems(board)"
            :content="{ align: 'end' }"
            class="absolute top-3 right-3"
            @click.stop.prevent
          >
            <UButton
              color="neutral"
              icon="i-lucide-ellipsis-vertical"
              aria-label="Board options"
            />
          </UDropdownMenu>

          <div class="flex items-center justify-center size-10 rounded-lg bg-primary/10 text-primary shrink-0">
            <UIcon name="i-lucide-kanban" class="size-5" />
          </div>
          <div class="min-w-0">
            <p class="truncate font-semibold text-highlighted">{{ board.name }}</p>
            <p class="flex items-center gap-1 text-xs text-muted">
              Abrir board
              <UIcon
                name="i-lucide-arrow-right"
                class="size-3.5 -translate-x-0.5 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all"
              />
            </p>
          </div>
        </NuxtLink>
      </div>

      <KanbanBoardCreateModal v-model:open="showCreateModal" @created="onBoardCreated" />
    </template>
  </UDashboardPanel>
</template>

<script setup lang="ts">
import type { DropdownMenuItem } from "@nuxt/ui";

definePageMeta({
  layout: "dashboard",
});

const currentTeam = useCurrentTeam();
const baseRoute = computed(() => `/${currentTeam.value?.slug ?? ""}`);

const kanban = useKanban();
const notification = useNotification();
const { data, status, refresh } = await kanban.useBoardList();
const boards = computed(() => data.value ?? []);

/**
 * "Settings" is disabled — a placeholder for per-board configuration that
 * doesn't exist yet. It's listed now so the menu doesn't need reshaping the
 * moment that lands; only `onSelect` wiring changes then.
 */
function boardMenuItems(board: { id: string; name: string }): DropdownMenuItem[][] {
  return [
    [
      {
        label: "Settings",
        icon: "i-lucide-settings",
        disabled: true,
      },
    ],
    [
      {
        label: "Delete",
        icon: "i-lucide-trash-2",
        color: "error" as const,
        onSelect: () => onDeleteBoard(board),
      },
    ],
  ];
}

async function onDeleteBoard(board: { id: string; name: string }) {
  const confirmed = await notification.confirm({
    title: "Delete board",
    description: `Are you sure you want to delete the board "${board.name}" and all of its content? This action cannot be undone.`,
    confirmLabel: "Delete",
  });
  if (!confirmed) return;

  try {
    await kanban.deleteBoard(board.id);
    await refresh();
  } catch (error) {
    notification.error("Error deleting board", getErrorMessage(error));
  }
}

// Only the very first load (no boards fetched yet) shows the full-page
// spinner — a later refresh (after creating a board) must not blank a grid
// the user is already looking at.
const showInitialLoader = computed(
  () => status.value === "pending" && !data.value,
);

const showCreateModal = ref(false);

async function onBoardCreated(board: { id: string }) {
  await refresh();
  navigateTo(`${baseRoute.value}/kanban/${board.id}`);
}
</script>
