<template>
  <div
    class="shrink-0 pl-3 pr-2 py-2 flex items-center justify-between gap-1.5 border-b select-none rounded-t transition-colors"
    :style="headerStyle"
  >
    <!-- Ícone de recolher coluna (lado esquerdo, igual ao modelo do template) -->
    <button
      type="button"
      class="p-1 rounded hover:bg-white/40 transition-colors shrink-0 focus:outline-none cursor-pointer"
      :title="`Recolher coluna ${name}`"
      :aria-label="`Recolher coluna ${name}`"
      @click="emit('collapse')"
    >
      <UIcon name="i-lucide-chevron-first" class="size-3.5" />
    </button>

    <!-- Modo de Edição Inline do Título -->
    <div v-if="isEditing" class="flex-1 flex items-center gap-1 min-w-0">
      <input
        ref="inputRef"
        v-model="draftName"
        type="text"
        class="w-full h-6 px-1.5 text-xs font-bold uppercase rounded bg-white text-highlighted border border-default focus:outline-none focus:ring-1 focus:ring-primary"
        @keyup.enter="saveEdit"
        @keyup.escape="cancelEdit"
      />
      <button
        type="button"
        class="p-0.5 rounded hover:bg-white/60 transition-colors shrink-0"
        title="Salvar"
        @click="saveEdit"
      >
        <UIcon name="i-lucide-check" class="size-3.5 text-success" />
      </button>
      <button
        type="button"
        class="p-0.5 rounded hover:bg-white/60 transition-colors shrink-0"
        title="Cancelar"
        @click="cancelEdit"
      >
        <UIcon name="i-lucide-x" class="size-3.5 text-muted" />
      </button>
    </div>

    <!-- Título normal + Contador -->
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

    <!-- Ações no canto direito: Editar lápis e Excluir lixeira -->
    <div v-if="!isEditing" class="flex items-center gap-0.5 shrink-0">
      <button
        type="button"
        class="p-1 rounded hover:bg-white/40 transition-colors focus:outline-none cursor-pointer"
        title="Editar nome da coluna"
        aria-label="Editar coluna"
        @click="startEdit"
      >
        <UIcon name="i-lucide-pencil" class="size-3.5" />
      </button>

      <button
        type="button"
        class="p-1 rounded hover:bg-white/40 hover:text-error transition-colors focus:outline-none cursor-pointer"
        title="Excluir coluna"
        aria-label="Excluir coluna"
        @click="confirmDelete"
      >
        <UIcon name="i-lucide-trash-2" class="size-3.5" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick } from "vue";

const props = defineProps<{
  name: string;
  cardCount: number;
  position?: number;
  color?: string;
}>();

const emit = defineEmits<{
  collapse: [];
  rename: [name: string];
  delete: [];
}>();

// Cores canônicas pré-definidas do template de referência (KanbanColumnFormModal)
const CORES_PREDEFINIDAS = [
  "#EC4899", // rosa (Pendente/Novo)
  "#3B82F6", // azul (Confirmado)
  "#F59E0B", // âmbar (Em Preparo)
  "#8B5CF6", // violeta (Preparado)
  "#06B6D4", // ciano (Saiu para Entrega)
  "#10B981", // esmeralda (Entregue)
  "#EF4444", // vermelho (Cancelado)
  "#6B7280", // cinza (neutra)
];

const headerStyle = computed(() => {
  const cor =
    props.color ||
    CORES_PREDEFINIDAS[(props.position ?? 0) % CORES_PREDEFINIDAS.length] ||
    "#6B7280";

  return {
    backgroundColor: `color-mix(in srgb, ${cor} 32%, #f8f8f8)`,
    borderColor: `color-mix(in srgb, ${cor} 55%, #e6e6e6)`,
    color: `color-mix(in srgb, ${cor} 65%, #1a1a1a)`,
  };
});

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

function confirmDelete() {
  if (window.confirm(`Deseja realmente excluir a coluna "${props.name}" e seus cards?`)) {
    emit("delete");
  }
}
</script>
