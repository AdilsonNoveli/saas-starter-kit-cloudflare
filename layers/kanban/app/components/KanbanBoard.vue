<template>
  <div class="flex items-start gap-4 overflow-x-auto pb-4">
    <KanbanColumn
      v-for="column in board.columns"
      :key="column.id"
      :column="column"
      @move="emit('move', $event)"
      @create-card="emit('createCard', $event)"
      @delete-card="emit('deleteCard', $event)"
    />

    <UForm
      :state="columnState"
      class="flex w-72 shrink-0 items-center gap-2 rounded-lg border border-dashed border-default p-3"
      @submit="submitColumn"
    >
      <UInput
        v-model="columnState.name"
        placeholder="Add a column"
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
</template>

<script setup lang="ts">
import type { KanbanBoardDetail } from "../../shared/types";

defineProps<{ board: KanbanBoardDetail }>();

const emit = defineEmits<{
  move: [payload: { cardId: string; toColumnId: string; position: number }];
  createCard: [payload: { columnId: string; title: string }];
  createColumn: [name: string];
  deleteCard: [cardId: string];
}>();

const columnState = reactive({ name: "" });

function submitColumn() {
  const name = columnState.name.trim();
  if (!name) return;
  emit("createColumn", name);
  columnState.name = "";
}
</script>
