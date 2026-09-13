<script setup lang="ts">
import { Store, Truck } from '@lucide/vue'
import AddressAutocomplete from '~/components/checkout/AddressAutocomplete.vue'
import type { AddressDetails } from '#shared/types/maps'
import { useFormatters } from '~/composables/useFormatters'

const { formatCurrency } = useFormatters()

defineProps<{
  tipoEntrega: 'RETIRADA' | 'ENTREGA'
  endereco: string
  bairro: string
  numero: string
  lat: number | null
  freteCalculado: number | null
  tentouEnviar: boolean
  addressOutOfRange: boolean
  addressRangeError: string
  permiteRetirada: boolean
}>()

const emit = defineEmits<{
  (e: 'update:tipoEntrega', value: 'RETIRADA' | 'ENTREGA'): void
  (e: 'update:endereco' | 'update:bairro' | 'update:numero', value: string): void
  (e: 'place-selected', details: AddressDetails): void
  (e: 'address-invalidate'): void
}>()
</script>

<template>
  <!-- 1. Método de entrega (Grid de Cards Interativos) -->
  <section v-if="permiteRetirada !== false">
    <h2 class="text-base font-bold text-text-primary mb-3">Método de entrega</h2>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <!-- Opção: Entrega -->
      <label
        class="relative flex flex-col justify-between p-5 rounded-xl border cursor-pointer transition-all hover:bg-surface-raised select-none"
        :class="tipoEntrega === 'ENTREGA' ? 'border-brand-green bg-brand-green/[0.02] shadow-sm ring-1 ring-brand-green' : 'border-border bg-surface'"
      >
        <div class="flex items-start justify-between mb-4">
          <div class="flex items-center gap-3">
            <input
              type="radio"
              name="tipoEntrega"
              value="ENTREGA"
              :checked="tipoEntrega === 'ENTREGA'"
              class="w-4 h-4 text-brand-green focus:ring-brand-green border-border"
              @click="emit('update:tipoEntrega', 'ENTREGA')"
            >
            <span class="text-sm font-bold text-text-primary">Receber em casa</span>
          </div>
          <Truck class="w-5 h-5" :class="tipoEntrega === 'ENTREGA' ? 'text-brand-green' : 'text-text-muted'" />
        </div>
        <div class="flex items-baseline justify-between mt-auto">
          <span class="text-xs text-text-secondary">Entrega domiciliar</span>
          <span class="text-sm font-bold" :class="tipoEntrega === 'ENTREGA' ? 'text-brand-green' : 'text-text-primary'">
            {{ freteCalculado === 0 ? 'Grátis' : (freteCalculado ? formatCurrency(freteCalculado) : 'A calcular') }}
          </span>
        </div>
      </label>

      <!-- Opção: Retirada -->
      <label
        class="relative flex flex-col justify-between p-5 rounded-xl border cursor-pointer transition-all hover:bg-surface-raised select-none"
        :class="tipoEntrega === 'RETIRADA' ? 'border-brand-green bg-brand-green/[0.02] shadow-sm ring-1 ring-brand-green' : 'border-border bg-surface'"
      >
        <div class="flex items-start justify-between mb-4">
          <div class="flex items-center gap-3">
            <input
              type="radio"
              name="tipoEntrega"
              value="RETIRADA"
              :checked="tipoEntrega === 'RETIRADA'"
              class="w-4 h-4 text-brand-green focus:ring-brand-green border-border"
              @click="emit('update:tipoEntrega', 'RETIRADA')"
            >
            <span class="text-sm font-bold text-text-primary">Retirar na loja</span>
          </div>
          <Store class="w-5 h-5" :class="tipoEntrega === 'RETIRADA' ? 'text-brand-green' : 'text-text-muted'" />
        </div>
        <div class="flex items-baseline justify-between mt-auto">
          <span class="text-xs text-text-secondary">Pegar no balcão</span>
          <span class="text-sm font-bold text-brand-green uppercase tracking-wider">Grátis</span>
        </div>
      </label>
    </div>
  </section>

  <!-- 2. Endereço (só se entrega) -->
  <section v-show="tipoEntrega === 'ENTREGA'" class="space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
    <h2 class="text-base font-bold text-text-primary mb-3">Endereço de entrega</h2>

    <div>
      <AddressAutocomplete
        :model-value="endereco"
        placeholder="Rua, número, cidade…"
        @update:model-value="emit('update:endereco', $event)"
        @select="emit('place-selected', $event)"
        @invalidate="emit('address-invalidate')"
      />
      <!-- Erro: endereço fora do raio de entrega -->
      <p
        v-if="addressOutOfRange"
        class="text-[12px] font-medium text-danger-600 mt-1.5 flex items-start gap-1"
      >
        <svg class="w-3.5 h-3.5 shrink-0 mt-px" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>
        {{ addressRangeError }}
      </p>
      <!-- Alerta: Digitou endereço mas não selecionou sugestão -->
      <div
        v-else-if="endereco && !lat"
        class="mt-2 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-lg text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2 animate-in fade-in duration-200"
      >
        <svg class="w-4 h-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
        </svg>
        <span>
          <strong>Atenção:</strong> Você digitou o endereço, mas precisa clicar na opção correta que aparece na lista de sugestões para validarmos a localização e calcularmos o frete.
        </span>
      </div>
      <!-- Hint padrão quando não digitou nada -->
      <p
        v-else
        class="text-[10px] text-text-muted mt-1"
      >
        Selecione o endereço na lista de sugestões para confirmar a localização.
      </p>
    </div>

    <div class="grid grid-cols-[2fr_1fr] gap-4">
      <div>
        <input
          id="neighborhood"
          :value="bairro"
          aria-label="Bairro"
          placeholder="Bairro"
          type="text"
          class="w-full px-3.5 py-2.5 border border-border rounded-lg bg-surface text-base text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green transition-colors"
          @input="emit('update:bairro', ($event.target as HTMLInputElement).value)"
        >
      </div>
      <div>
        <input
          id="number"
          :value="numero"
          aria-label="Número"
          placeholder="Nº"
          type="text"
          class="w-full px-3.5 py-2.5 border border-border rounded-lg bg-surface text-base text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green transition-colors"
          @input="emit('update:numero', ($event.target as HTMLInputElement).value)"
        >
      </div>
    </div>

    <!-- Validação inline de endereço (aparece após tentar confirmar) -->
    <p
      v-if="tentouEnviar && !endereco"
      class="text-xs text-red-500 mt-2 flex items-center gap-1"
    >
      <svg class="w-3 h-3 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>
      Informe o endereço de entrega
    </p>
    <p
      v-else-if="tentouEnviar && endereco && !bairro"
      class="text-xs text-red-500 mt-2 flex items-center gap-1"
    >
      <svg class="w-3 h-3 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>
      Informe o bairro
    </p>
    <p
      v-else-if="tentouEnviar && endereco && !numero"
      class="text-xs text-red-500 mt-2 flex items-center gap-1"
    >
      <svg class="w-3 h-3 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>
      Informe o número da residência
    </p>
  </section>
</template>
