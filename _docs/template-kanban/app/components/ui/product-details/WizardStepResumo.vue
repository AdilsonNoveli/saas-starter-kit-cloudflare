<script setup lang="ts">
import { computed } from 'vue'
import { Minus, Plus, Pencil } from '@lucide/vue'
import type { OptionGroup } from '~~/shared/types/product'

/**
 * Step final do wizard: resumo compacto das variações (chips) + quantidade + preço inline.
 * Chips exibem apenas o nome da variação escolhida + ícone de edição (pencil).
 * O botão CTA e os controles de navegação vivem no orquestrador (OptionGroupsSelector).
 */
interface FileValue { url: string; key: string; nomeOriginal: string }

const props = defineProps<{
  grupos: readonly OptionGroup[]
  selections: Map<string, Set<string>>
  textValues: Map<string, string>
  fileValues: Map<string, FileValue>
  quantidade: number
  maxAdicionavel: number | null
  permiteFracionamento: boolean
  unidadeMedida: string | null
}>()

const emit = defineEmits<{
  decrement: []
  increment: []
  /** Solicita ao orquestrador que salte para o step do grupo pelo índice. */
  'jump-to': [stepIndex: number]
}>()

const isMaxReached = computed(
  () => props.maxAdicionavel !== null && props.quantidade >= props.maxAdicionavel,
)

function hasSelection(grupo: OptionGroup): boolean {
  const { tipo, id } = grupo
  if (tipo === 'texto_livre') {
    return !!props.textValues.get(id)?.trim()
  }
  if (tipo === 'upload_arquivo') {
    return !!props.fileValues.get(id)
  }
  const selectedIds = props.selections.get(id)
  return !!selectedIds && selectedIds.size > 0
}

/** Rótulo de resumo com apenas o nome da variação/valor */
function groupSummary(grupo: OptionGroup): string {
  const { tipo, id } = grupo

  if (tipo === 'texto_livre') {
    const val = props.textValues.get(id)?.trim() || ''
    return val.length > 25 ? `${val.slice(0, 25)}…` : val
  }
  if (tipo === 'upload_arquivo') {
    return props.fileValues.get(id)?.nomeOriginal ?? 'Arquivo'
  }

  const selectedIds = props.selections.get(id) ?? new Set<string>()
  const names = grupo.produto_opcao_item
    .filter((item) => selectedIds.has(item.id))
    .map((item) => item.nome)
  return names.join(', ')
}

const displayQuantity = computed(() =>
  props.permiteFracionamento
    ? props.quantidade.toFixed(1)
    : String(props.quantidade),
)
</script>

<template>
  <div class="p-5 space-y-4">
    <!-- Resumo compacto das opções em chips (apenas nome da variação + pencil) -->
    <section v-if="grupos.length > 0" aria-label="Resumo das opções">
      <h4 class="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-2.5">
        Suas escolhas
      </h4>
      <div class="flex flex-wrap gap-2">
        <template v-for="(grupo, i) in grupos" :key="grupo.id">
          <div
            v-if="hasSelection(grupo)"
            class="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-surface-raised border border-border text-xs text-text-primary transition-colors hover:border-brand/40 group select-none"
          >
            <span class="font-semibold">{{ groupSummary(grupo) }}</span>
            <button
              type="button"
              class="p-0.5 rounded-xs text-text-muted hover:text-brand transition-colors cursor-pointer focus:outline-none"
              :title="`Alterar ${grupo.nome}`"
              :aria-label="`Alterar ${grupo.nome}`"
              @click="emit('jump-to', i)"
            >
              <Pencil class="w-3.5 h-3.5 text-text-muted group-hover:text-brand" />
            </button>
          </div>
        </template>
      </div>
    </section>

    <!-- Divisor -->
    <div class="h-px bg-border" />

    <!-- Seletor de quantidade -->
    <div class="flex items-center justify-between gap-3">
      <span class="text-sm font-semibold text-text-primary">Quantidade</span>

      <div class="flex items-center gap-2.5 sm:gap-3 shrink-0">
        <!-- Controles −/n/+ -->
        <div class="flex items-center border border-border rounded-md h-[36px] bg-surface overflow-hidden">
          <button
            type="button"
            class="px-3 h-full hover:bg-surface-raised transition-colors focus:outline-none flex items-center justify-center text-text-secondary active:scale-95"
            aria-label="Diminuir quantidade"
            @click="emit('decrement')"
          >
            <Minus class="w-4 h-4" />
          </button>

          <span
            class="w-10 text-center font-semibold text-sm text-text-primary select-none"
            aria-live="polite"
          >
            {{ displayQuantity }}
          </span>

          <button
            type="button"
            class="px-3 h-full hover:bg-surface-raised transition-colors focus:outline-none flex items-center justify-center text-text-secondary active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
            :disabled="isMaxReached"
            :title="isMaxReached ? 'Estoque no limite' : undefined"
            aria-label="Aumentar quantidade"
            @click="emit('increment')"
          >
            <Plus class="w-4 h-4" />
          </button>
        </div>

        <!-- Badge de unidade (altura sincronizada com o stepper h-[36px]) -->
        <span class="h-[36px] inline-flex items-center justify-center text-xs font-semibold text-text-muted bg-surface-raised px-3 rounded-md border border-border uppercase select-none">
          {{ unidadeMedida || 'un' }}
        </span>
      </div>
    </div>
  </div>
</template>
