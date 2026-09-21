<template>
  <div
    class="shrink-0 pl-3 pr-2 py-2 flex items-center justify-between gap-1.5 border-b select-none rounded-t transition-colors"
    :style="headerStyle"
  >
    <!-- Collapse column icon (left side, as in the template) -->
    <button
      type="button"
      class="p-1 rounded hover:brightness-110 transition-[filter] shrink-0 focus:outline-none cursor-pointer"
      :title="`Collapse column ${name}`"
      :aria-label="`Collapse column ${name}`"
      @click="emit('collapse')"
    >
      <UIcon name="i-lucide-chevron-first" class="size-3.5" />
    </button>

    <!-- Inline title edit mode -->
    <div v-if="isEditing" class="flex-1 flex items-center gap-1 min-w-0">
      <input
        ref="inputRef"
        v-model="draftName"
        type="text"
        class="w-full h-6 px-1.5 text-xs font-bold uppercase rounded bg-default text-highlighted border border-default focus:outline-none focus:ring-1 focus:ring-primary"
        @keyup.enter="saveEdit"
        @keyup.escape="cancelEdit"
      />
      <button
        type="button"
        class="p-0.5 rounded hover:brightness-110 transition-[filter] shrink-0"
        title="Save"
        @click="saveEdit"
      >
        <UIcon name="i-lucide-check" class="size-3.5 text-success" />
      </button>
      <button
        type="button"
        class="p-0.5 rounded hover:brightness-110 transition-[filter] shrink-0"
        title="Cancel"
        @click="cancelEdit"
      >
        <UIcon name="i-lucide-x" class="size-3.5 text-muted" />
      </button>
    </div>

    <!-- Regular title + counter -->
    <div v-else class="flex-1 min-w-0 flex items-center gap-1.5">
      <span class="text-xs font-bold uppercase tracking-wider truncate">
        {{ name }}
      </span>
      <span
        class="text-[10px] font-extrabold tabular-nums leading-none opacity-80 bg-white/60 dark:bg-black/20 px-1.5 py-0.5 rounded border border-current/20 shrink-0"
      >
        {{ cardCount }}
      </span>
    </div>

    <!-- Right-hand actions: edit (pencil) and delete (trash) -->
    <div v-if="!isEditing" class="flex items-center gap-0.5 shrink-0">
      <button
        type="button"
        class="p-1 rounded hover:brightness-110 transition-[filter] focus:outline-none cursor-pointer"
        title="Edit column name"
        aria-label="Edit column"
        @click="startEdit"
      >
        <UIcon name="i-lucide-pencil" class="size-3.5" />
      </button>

      <button
        type="button"
        class="p-1 rounded hover:brightness-110 hover:text-error transition-[filter,color] focus:outline-none cursor-pointer"
        title="Delete column"
        aria-label="Delete column"
        @click="confirmDelete"
      >
        <UIcon name="i-lucide-trash-2" class="size-3.5" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick } from "vue";
import { kanbanColumnAccentStyle } from "../utils/kanbanColumnAccent";

const props = defineProps<{
  name: string;
  cardCount: number;
  position?: number;
}>();

const emit = defineEmits<{
  collapse: [];
  rename: [name: string];
  delete: [];
}>();

const headerStyle = computed(() => kanbanColumnAccentStyle(props.position));

const notification = useNotification();

const isEditing = ref(false);
const draftName = ref("");
const inputRef = ref<HTMLInputElement | null>(null);

function startEdit() {
  draftName.value = props.name;
  isEditing.value = true;
  nextTick(() => {
    inputRef.value?.focus();
    inputRef.value?.select();
  });
}

function saveEdit() {
  const trimmed = draftName.value.trim();
  if (trimmed && trimmed !== props.name) {
    emit("rename", trimmed);
  }
  isEditing.value = false;
}

function cancelEdit() {
  isEditing.value = false;
}

async function confirmDelete() {
  const confirmed = await notification.confirm({
    title: "Delete column",
    description: `Are you sure you want to delete the column "${props.name}" and its cards? This action cannot be undone.`,
    confirmLabel: "Delete",
  });
  if (confirmed) emit("delete");
}
</script>
