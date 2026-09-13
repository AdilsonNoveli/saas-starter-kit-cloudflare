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
      <div class="space-y-4 sm:space-y-6">
        <UForm
          :schema="schema"
          :state="state"
          class="flex items-start gap-2"
          @submit="createBoard"
        >
          <UFormField name="name" class="flex-1">
            <UInput
              v-model="state.name"
              placeholder="New board name"
              class="w-full"
            />
          </UFormField>
          <UButton
            type="submit"
            label="New board"
            icon="i-lucide-plus"
            :loading="creating"
          />
        </UForm>

        <div
          v-if="status === 'pending'"
          class="flex justify-center py-12 text-muted"
        >
          <UIcon name="i-lucide-loader-circle" class="size-6 animate-spin" />
        </div>

        <div
          v-else-if="!boards.length"
          class="flex flex-col items-center justify-center rounded-lg border border-dashed border-default p-12 text-center"
        >
          <UIcon name="i-lucide-kanban" class="mb-4 size-12 text-dimmed" />
          <p class="mb-1 text-lg font-semibold">No boards yet</p>
          <p class="text-sm text-muted">
            Create your first board to start tracking work.
          </p>
        </div>

        <div v-else class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <UCard
            v-for="board in boards"
            :key="board.id"
            variant="subtle"
            class="transition hover:ring-2 hover:ring-primary"
          >
            <NuxtLink :to="`${baseRoute}/kanban/${board.id}`" class="block">
              <div class="flex items-center gap-3">
                <UIcon name="i-lucide-kanban" class="size-5 text-primary" />
                <span class="truncate font-medium">{{ board.name }}</span>
              </div>
            </NuxtLink>
          </UCard>
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>

<script setup lang="ts">
import { z } from "zod";

definePageMeta({
  layout: "dashboard",
});

const toast = useToast();
const currentTeam = useCurrentTeam();
const baseRoute = computed(() => `/${currentTeam.value?.slug ?? ""}`);

const kanban = useKanban();
const { data, status, refresh } = await kanban.useBoardList();
const boards = computed(() => data.value ?? []);

const schema = z.object({
  name: z.string().min(2, "Board name must be at least 2 characters"),
});
const state = reactive({ name: "" });
const creating = ref(false);

async function createBoard() {
  creating.value = true;
  try {
    await kanban.createBoard(state.name.trim());
    state.name = "";
    await refresh();
    toast.add({
      title: "Board created",
      color: "success",
      icon: "i-lucide-check",
    });
  } catch (error: any) {
    toast.add({
      title: "Failed to create board",
      description: error?.message || "Something went wrong",
      color: "error",
      icon: "i-lucide-x",
    });
  } finally {
    creating.value = false;
  }
}
</script>
