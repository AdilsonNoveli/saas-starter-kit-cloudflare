<script setup lang="ts">
import { onUnmounted } from 'vue'
import { Check } from '@lucide/vue'
import type { OptionGroup } from '~~/shared/types/product'

/**
 * Step de seleção única (tipo `single`).
 * Grid de chips táteis com foto opcional, nome e badge de preço delta.
 * Auto-advance: emite `auto-advance` 300 ms após a seleção para avançar
 * automaticamente sem forçar o clique em "Próximo".
 */
defineProps<{
  grupo: OptionGroup
  selectedId: string | undefined
}>()

const emit = defineEmits<{
  select: [itemId: string]
  'auto-advance': []
}>()

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

let advanceTimer: ReturnType<typeof setTimeout> | null = null

function select(itemId: string): void {
  // Cancela timer anterior se o usuário trocar a seleção rapidamente
  if (advanceTimer) clearTimeout(advanceTimer)
  emit('select', itemId)
  advanceTimer = setTimeout(() => emit('auto-advance'), 300)
}

onUnmounted(() => {
  if (advanceTimer) clearTimeout(advanceTimer)
})
</script>

<template>
  <div class="p-5 grid grid-cols-2 gap-3">
    <button
      v-for="item in grupo.produto_opcao_item"
      :key="item.id"
      type="button"
      :aria-pressed="selectedId === item.id"
      class="relative flex flex-col items-center gap-2 p-3 rounded-md border-2 transition-all duration-200 active:scale-[0.97] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/50"
      :class="
        selectedId === item.id
          ? 'border-brand bg-brand/5'
          : 'border-border bg-surface hover:border-brand/40 hover:bg-surface-raised'
      "
      @click="select(item.id)"
    >
      <!-- Miniatura (quando disponível) -->
      <div
        v-if="item.foto_url"
        class="w-14 h-14 rounded-sm overflow-hidden border border-border shrink-0"
      >
        <NuxtImg
          :src="item.foto_url"
          :alt="item.nome"
          loading="lazy"
          class="w-full h-full object-cover"
        />
      </div>

      <!-- Nome -->
      <span class="text-sm font-semibold text-text-primary text-center leading-snug">
        {{ item.nome }}
      </span>

      <!-- Badge de preço extra -->
      <span
        v-if="Number(item.preco_delta) !== 0"
        class="text-[10px] font-bold px-1.5 py-0.5 rounded-sm"
        :class="
          Number(item.preco_delta) > 0
            ? 'bg-brand/10 text-brand'
            : 'bg-danger-50 text-danger-600'
        "
      >
        {{ Number(item.preco_delta) > 0 ? '+' : '' }}{{ formatCurrency(Number(item.preco_delta)) }}
      </span>

      <!-- Indicador de selecionado (canto superior direito) -->
      <Transition
        enter-active-class="transition-all duration-200"
        enter-from-class="opacity-0 scale-50"
        enter-to-class="opacity-100 scale-100"
        leave-active-class="transition-all duration-150"
        leave-from-class="opacity-100 scale-100"
        leave-to-class="opacity-0 scale-50"
      >
        <div
          v-if="selectedId === item.id"
          class="preserve-circle absolute top-2 right-2 w-5 h-5 bg-brand rounded-full flex items-center justify-center"
        >
          <Check class="w-3 h-3 text-text-inverse" :stroke-width="3" />
        </div>
      </Transition>
    </button>
  </div>
</template>
