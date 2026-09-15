<template>
  <UModal v-model:open="open" :dismissible="false" title="Novo board">
    <template #content>
      <UForm
        :schema="schema"
        :state="state"
        :validate-on="['input']"
        @submit="create"
      >
        <UCard>
          <template #header>
            <div class="flex items-center justify-between">
              <span class="font-semibold">Novo board</span>
              <UButton
                icon="i-lucide-x"
                variant="ghost"
                color="neutral"
                @click="close"
              />
            </div>
          </template>

          <UFormField label="Nome" name="name" required>
            <UInput
              v-model="state.name"
              placeholder="Nome do board"
              class="w-full"
              autofocus
            />
          </UFormField>

          <template #footer>
            <div class="w-full flex justify-end">
              <UButton :loading="loading" type="submit" label="Criar" />
            </div>
          </template>
        </UCard>
      </UForm>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { z } from "zod";
import type { KanbanBoardItem } from "../../shared/types";

const open = defineModel<boolean>("open", { default: false });
const emit = defineEmits<{ created: [board: KanbanBoardItem] }>();

const kanban = useKanban();
const notification = useNotification();

const schema = z.object({
  name: z
    .string()
    .min(2, "O nome deve ter pelo menos 2 caracteres")
    .max(80, "O nome deve ter no máximo 80 caracteres"),
});
const state = reactive({ name: "" });
const loading = ref(false);

function reset() {
  state.name = "";
}

function close() {
  open.value = false;
  reset();
}

async function create() {
  loading.value = true;
  try {
    const board = await kanban.createBoard(state.name.trim());
    if (!board) throw new Error("No board returned");
    emit("created", board);
    close();
  } catch (error: any) {
    notification.error(
      "Erro ao criar board",
      error?.message || "Algo deu errado",
    );
  } finally {
    loading.value = false;
  }
}
</script>
