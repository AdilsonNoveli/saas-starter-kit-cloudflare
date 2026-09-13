<script setup lang="ts">
import { computed } from 'vue'
import { Check } from '@lucide/vue'
import type { WizardStep } from '~/composables/useProductWizard'

/**
 * Barra de progresso do wizard: pills numeradas com estados done/ativo/pendente.
 * Pills de steps já visitados são clicáveis (permitem retorno rápido).
 * Responsabilidade única: visual de posição — nenhuma lógica de negócio.
 */
const props = defineProps<{
  steps: readonly WizardStep[]
  currentStep: number
  visitedSteps: Set<number>
}>()

const emit = defineEmits<{
  'jump-to': [index: number]
}>()

/** Exclui o step `loading` da barra — não faz sentido exibir pill para ele. */
const pills = computed(() =>
  props.steps
    .map((step, index) => ({ step, index }))
    .filter(({ step }) => step.kind !== 'loading'),
)

/** Com 6+ steps, usa modo compacto: círculos menores sem rótulo de texto. */
const compact = computed(() => pills.value.length > 5)

function stepLabel(step: WizardStep): string {
  if (step.kind === 'grupo') return step.grupo.nome
  if (step.kind === 'preorder') return 'Data'
  return 'Confirmar'
}

function isCompleted(index: number): boolean {
  return props.visitedSteps.has(index) && index < props.currentStep
}

function isActive(index: number): boolean {
  return index === props.currentStep
}
</script>

<template>
  <div
    class="px-4 pt-3 pb-1.5 shrink-0 flex items-start gap-1 overflow-x-auto"
    role="list"
    aria-label="Progresso do pedido"
  >
    <template v-for="({ step, index }, i) in pills" :key="index">
      <!-- Linha conectora alinhada ao centro do círculo -->
      <div
        class="flex-1 h-px min-w-2 bg-border shrink"
        :class="compact ? 'mt-2.5' : 'mt-3.5'"
      />

      <!-- Pill -->
      <button
        type="button"
        role="listitem"
        :aria-label="`${stepLabel(step)}${isCompleted(index) ? ' — concluído, clique para editar' : ''}`"
        :aria-current="isActive(index) ? 'step' : undefined"
        :disabled="!isCompleted(index)"
        class="flex flex-col items-center shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/50 rounded"
        :class="isCompleted(index) ? 'cursor-pointer' : 'cursor-default pointer-events-none'"
        @click="isCompleted(index) && emit('jump-to', index)"
      >
        <!-- Círculo indicador 1:1 perfeito protegido contra distorção de raio do catálogo -->
        <div
          class="preserve-circle flex items-center justify-center rounded-full font-bold transition-all duration-200 shrink-0 aspect-square select-none"
          :class="[
            compact ? 'w-5 h-5 text-[10px]' : 'w-7 h-7 text-xs',
            isActive(index)
              ? 'bg-brand text-text-inverse ring-4 ring-brand/20'
              : isCompleted(index)
                ? 'bg-brand text-text-inverse hover:scale-105'
                : 'bg-surface-raised border border-border text-text-muted',
          ]"
        >
          <Check
            v-if="isCompleted(index)"
            :class="compact ? 'w-3 h-3' : 'w-3.5 h-3.5'"
            :stroke-width="2.5"
          />
          <span v-else class="leading-none">{{ i + 1 }}</span>
        </div>

        <!-- Rótulo: altura fixa para manter o alinhamento das linhas -->
        <div v-if="!compact" class="h-4 flex items-center justify-center mt-1">
          <span
            v-if="isActive(index)"
            class="text-[10px] font-semibold text-brand max-w-16 text-center leading-tight line-clamp-1"
          >
            {{ stepLabel(step) }}
          </span>
        </div>
      </button>
    </template>

    <!-- Linha final após última pill -->
    <div
      class="flex-1 h-px min-w-2 bg-border shrink"
      :class="compact ? 'mt-2.5' : 'mt-3.5'"
    />
  </div>
</template>
