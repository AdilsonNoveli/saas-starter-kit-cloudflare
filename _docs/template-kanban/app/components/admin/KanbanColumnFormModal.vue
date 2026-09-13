<script setup lang="ts">
/**
 * @descricao: Modal de criação/edição de coluna do Kanban (Fase 5.10).
 * @objetivo: Editar o `label` e a `cor` de uma coluna (ou criar uma nova). A
 *   `chave` (identidade/slug) é gerada/derivada fora daqui e nunca é editável —
 *   é o contrato estável usado por `pedidos.status` e pelos webhooks. Modal único
 *   reutilizado para "adicionar" e "editar" (DRY).
 *
 *   Seleção de cor: paleta de predefinidas (as cores canônicas do quadro) +
 *   seletor livre e campo hex. A pré-visualização replica a fórmula real do
 *   cabeçalho da coluna (color-mix sobre os tokens do tema), então o operador
 *   vê exatamente o resultado — em light e dark mode.
 */
import { computed, ref, watch } from 'vue'
import { Check, Pipette } from '@lucide/vue'
import UiModal from '~/components/ui/Modal.vue'

const props = defineProps<{
  readonly open: boolean
  readonly mode: 'add' | 'edit'
  /** Valores iniciais (no modo edição). */
  readonly label?: string
  readonly cor?: string
}>()

const emit = defineEmits<{
  (e: 'save', value: { label: string; cor: string }): void
  (e: 'close'): void
}>()

const COR_PADRAO = '#6B7280'
const HEX_REGEX = /^#[0-9a-fA-F]{6}$/

/** Paleta predefinida — espelha as cores canônicas do quadro. */
const CORES_PREDEFINIDAS: readonly string[] = [
  '#EC4899', // rosa (Pendente)
  '#3B82F6', // azul (Confirmado)
  '#F59E0B', // âmbar (Em Preparo)
  '#8B5CF6', // violeta (Preparado)
  '#06B6D4', // ciano (Saiu para Entrega)
  '#10B981', // esmeralda (Entregue)
  '#EF4444', // vermelho (Cancelado)
  '#6B7280', // cinza (neutra)
]

const draftLabel = ref<string>('')
const draftCor = ref<string>(COR_PADRAO)

// Sincroniza o rascunho quando o modal abre (evita estado vazado entre aberturas).
watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      draftLabel.value = props.label ?? ''
      draftCor.value = props.cor ?? COR_PADRAO
    }
  },
  { immediate: true },
)

const corValida = computed<boolean>(() => HEX_REGEX.test(draftCor.value))
const podeSalvar = computed<boolean>(() => draftLabel.value.trim().length > 0 && corValida.value)
const titulo = computed<string>(() => (props.mode === 'add' ? 'Nova coluna' : 'Editar coluna'))

/** Mesma fórmula do cabeçalho real do kanban (orders/index.vue). */
const previewStyle = computed<Record<string, string>>(() => {
  const cor = corValida.value ? draftCor.value : COR_PADRAO
  return {
    backgroundColor: `color-mix(in srgb, ${cor} 32%, var(--color-surface-raised))`,
    borderColor: `color-mix(in srgb, ${cor} 55%, var(--color-border))`,
    color: `color-mix(in srgb, ${cor} 60%, var(--color-text-primary))`,
  }
})

function selectPreset(cor: string): void {
  draftCor.value = cor
}

function handleSave(): void {
  if (!podeSalvar.value) return
  emit('save', { label: draftLabel.value.trim(), cor: draftCor.value })
}

function handleClose(): void {
  emit('close')
}
</script>

<template>
  <UiModal
    :open="open"
    :title="titulo"
    size="sm"
    @update:open="(v) => !v && handleClose()"
    @close="handleClose"
  >
    <div class="space-y-5">
      <!-- Nome -->
      <div class="flex flex-col gap-1.5">
        <label for="kanban-col-label" class="text-xs font-semibold uppercase tracking-wide text-text-muted">
          Nome da coluna
        </label>
        <input
          id="kanban-col-label"
          v-model="draftLabel"
          type="text"
          maxlength="40"
          placeholder="Ex.: Em Preparo"
          class="rounded-md border border-border bg-surface px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 transition-all"
          @keyup.enter="handleSave"
        >
      </div>

      <!-- Cor -->
      <div class="flex flex-col gap-2">
        <span class="text-xs font-semibold uppercase tracking-wide text-text-muted">
          Cor do cabeçalho
        </span>

        <!-- Predefinidas -->
        <div class="grid grid-cols-8 gap-2">
          <button
            v-for="preset in CORES_PREDEFINIDAS"
            :key="preset"
            type="button"
            class="relative h-8 rounded-md border transition-all hover:scale-105 active:scale-95 cursor-pointer"
            :class="draftCor.toUpperCase() === preset.toUpperCase()
              ? 'border-text-primary ring-2 ring-text-primary/25'
              : 'border-border hover:border-text-muted'"
            :style="{ backgroundColor: preset }"
            :aria-label="`Selecionar cor ${preset}`"
            :title="preset"
            @click="selectPreset(preset)"
          >
            <Check
              v-if="draftCor.toUpperCase() === preset.toUpperCase()"
              class="absolute inset-0 m-auto w-4 h-4 text-white drop-shadow"
              stroke-width="3"
            />
          </button>
        </div>

        <!-- Cor personalizada: seletor nativo estilizado + hex -->
        <div class="flex items-center gap-2 mt-1">
          <label
            class="relative h-9 w-11 rounded-md border border-border overflow-hidden cursor-pointer shrink-0 hover:border-text-muted transition-colors"
            title="Escolher cor personalizada"
          >
            <input
              id="kanban-col-cor"
              v-model="draftCor"
              type="color"
              class="absolute inset-0 w-full h-full cursor-pointer opacity-0"
              aria-label="Selecionar cor personalizada"
            >
            <span
              class="absolute inset-0 flex items-center justify-center"
              :style="{ backgroundColor: corValida ? draftCor : COR_PADRAO }"
            >
              <Pipette class="w-3.5 h-3.5 text-white drop-shadow" stroke-width="2" />
            </span>
          </label>
          <input
            v-model="draftCor"
            type="text"
            maxlength="7"
            placeholder="#6B7280"
            class="flex-1 rounded-md border bg-surface px-3 py-2 text-sm font-mono uppercase text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 transition-all"
            :class="corValida
              ? 'border-border focus:border-brand-green focus:ring-brand-green/20'
              : 'border-alert focus:border-alert focus:ring-alert/20'"
            aria-label="Código hexadecimal da cor"
          >
        </div>
        <p v-if="!corValida" class="text-[11px] text-alert font-medium">
          Informe um hexadecimal válido no formato #RRGGBB.
        </p>
      </div>

      <!-- Pré-visualização fiel do cabeçalho -->
      <div class="flex flex-col gap-1.5">
        <span class="text-xs font-semibold uppercase tracking-wide text-text-muted">
          Pré-visualização
        </span>
        <div class="rounded-md border border-border overflow-hidden bg-surface-raised">
          <div
            class="border-b pl-3 pr-2 py-2.5 flex items-center gap-2 select-none"
            :style="previewStyle"
          >
            <span class="flex-1 text-xs font-bold uppercase tracking-wider truncate flex items-center gap-1.5">
              <span>{{ draftLabel.trim() || 'Nome da coluna' }}</span>
              <span class="text-[10px] font-extrabold tabular-nums leading-none opacity-80">3</span>
            </span>
          </div>
          <div class="h-8" />
        </div>
      </div>
    </div>

    <template #footer>
      <button
        type="button"
        class="px-4 py-2 rounded-lg border border-border text-xs font-bold uppercase tracking-wider text-text-primary bg-surface hover:bg-surface-raised transition-all active:scale-95 cursor-pointer"
        @click="handleClose"
      >
        Cancelar
      </button>
      <button
        type="button"
        class="px-4 py-2 rounded-lg bg-brand-green hover:bg-brand-greenDark text-white text-xs font-bold uppercase tracking-wider transition-all shadow-xs active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        :disabled="!podeSalvar"
        @click="handleSave"
      >
        Salvar
      </button>
    </template>
  </UiModal>
</template>
