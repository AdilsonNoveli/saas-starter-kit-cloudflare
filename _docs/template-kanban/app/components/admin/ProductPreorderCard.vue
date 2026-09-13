<!--
  @descricao: Card "Configuração de Encomenda" (Pre-Order System).
  @objetivo: Quantidade min/max e antecedência de agendamento por pedido —
    extraído de `[id].vue` (Card 1b). Renderizado apenas quando o produto é
    do tipo 'preorder'. A capacidade diária total vive no card de Estoque
    (migration 113) — não duplicada aqui.
-->

<script setup lang="ts">
import { CalendarDays } from '@lucide/vue'
import type { PreorderFormState } from '~/composables/useProductPreorderConfig'

defineProps<{
  unidadeMedida: string
  permiteFracionamento: boolean
}>()

const preorderForm = defineModel<PreorderFormState>('preorderForm', { required: true })
</script>

<template>
  <div class="border border-border bg-surface-raised p-5 space-y-4 rounded-md">
    <div class="flex items-center justify-between border-b border-border pb-3">
      <div class="flex items-center gap-2">
        <CalendarDays class="w-4.5 h-4.5 text-brand-green" />
        <h3 class="text-sm font-bold text-text-primary uppercase tracking-wider">Configuração de Encomenda</h3>
      </div>
      <span class="text-xs font-semibold px-2 py-0.5 rounded bg-brand-green/10 text-brand-green border border-brand-green/20">
        Unidade: {{ unidadeMedida || 'un' }} {{ permiteFracionamento ? '(Fracionado)' : '(Inteiro)' }}
      </span>
    </div>

    <p class="text-[10px] text-text-muted mt-1">
      Quantidade mínima e máxima por pedido, antecedência de agendamento e capacidade diária total (configurada no card Estoque). Datas ficam indisponíveis automaticamente quando a capacidade é atingida.
    </p>

    <!-- Avisos de Validação em Tempo Real -->
    <div v-if="preorderForm.min_quantity > preorderForm.max_quantity" class="p-2.5 bg-danger-50 dark:bg-danger-950/40 border border-danger-200 dark:border-danger-800 rounded-lg text-xs font-medium text-danger-600 dark:text-danger-400">
      ⚠️ A quantidade mínima ({{ preorderForm.min_quantity }}) não pode ser maior que a quantidade máxima ({{ preorderForm.max_quantity }}).
    </div>
    <div v-if="preorderForm.min_lead_days > preorderForm.max_lead_days" class="p-2.5 bg-danger-50 dark:bg-danger-950/40 border border-danger-200 dark:border-danger-800 rounded-lg text-xs font-medium text-danger-600 dark:text-danger-400">
      ⚠️ A antecedência mínima ({{ preorderForm.min_lead_days }} dias) não pode ser maior que a antecedência máxima ({{ preorderForm.max_lead_days }} dias).
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div>
        <label for="preorder-min-qty" class="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">
          Qtd. mínima ({{ unidadeMedida || 'un' }})
        </label>
        <UiNumberInput
          id="preorder-min-qty"
          :model-value="preorderForm.min_quantity"
          :min="0.001"
          :step="permiteFracionamento ? 0.1 : 1"
          @update:model-value="(v) => preorderForm.min_quantity = v ?? 1"
        />
        <p class="text-[10px] text-text-muted mt-1">Menor lote ou quantidade aceita por pedido.</p>
      </div>

      <div>
        <label for="preorder-max-qty" class="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">
          Qtd. máxima ({{ unidadeMedida || 'un' }})
        </label>
        <UiNumberInput
          id="preorder-max-qty"
          :model-value="preorderForm.max_quantity"
          :min="0.001"
          :step="permiteFracionamento ? 0.1 : 1"
          @update:model-value="(v) => preorderForm.max_quantity = v ?? 1"
        />
        <p class="text-[10px] text-text-muted mt-1">Limite máximo por pedido individual.</p>
      </div>

      <div>
        <label for="preorder-min-lead" class="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">
          Antecedência mínima (dias)
        </label>
        <UiNumberInput
          id="preorder-min-lead"
          :model-value="preorderForm.min_lead_days"
          :min="0"
          :step="1"
          :precision="0"
          @update:model-value="(v) => preorderForm.min_lead_days = v ?? 0"
        />
        <p class="text-[10px] text-text-muted mt-1">Dias mínimos de antecedência para agendar.</p>
      </div>

      <div>
        <label for="preorder-max-lead" class="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">
          Antecedência máxima (dias)
        </label>
        <UiNumberInput
          id="preorder-max-lead"
          :model-value="preorderForm.max_lead_days"
          :min="1"
          :step="1"
          :precision="0"
          @update:model-value="(v) => preorderForm.max_lead_days = v ?? 1"
        />
        <p class="text-[10px] text-text-muted mt-1">Janela máxima no futuro para abrir a agenda.</p>
      </div>
    </div>
  </div>
</template>
