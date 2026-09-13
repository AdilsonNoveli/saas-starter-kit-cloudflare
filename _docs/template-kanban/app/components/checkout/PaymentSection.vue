<script setup lang="ts">
defineProps<{
  modelValue: 'PIX' | 'DINHEIRO' | 'CARTAO' | null
  tentouEnviar: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: 'PIX' | 'DINHEIRO' | 'CARTAO'): void
}>()
</script>

<template>
  <!-- 3. Forma de pagamento (Grid de Cards Interativos) -->
  <section>
    <h2 class="text-base font-bold text-text-primary mb-3">Forma de pagamento</h2>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
      <!-- PIX -->
      <label
        class="relative flex flex-col justify-between p-4 rounded-xl border cursor-pointer transition-all hover:bg-surface-raised select-none"
        :class="modelValue === 'PIX' ? 'border-brand-green bg-brand-green/[0.02] shadow-sm ring-1 ring-brand-green' : 'border-border bg-surface'"
      >
        <div class="flex items-start justify-between mb-4">
          <div class="flex items-center gap-3">
            <input
              type="radio"
              name="formaPagamento"
              value="PIX"
              :checked="modelValue === 'PIX'"
              class="w-4 h-4 text-brand-green focus:ring-brand-green border-border"
              @click="emit('update:modelValue', 'PIX')"
            >
            <span class="text-sm font-bold text-text-primary">Pix</span>
          </div>
          <img src="/icons/pix.svg" alt="Pix" class="w-5 h-5 shrink-0">
        </div>
        <div class="mt-auto">
          <p class="text-xs text-text-secondary">Aprovação imediata e segura</p>
        </div>
      </label>

      <!-- Dinheiro -->
      <label
        class="relative flex flex-col justify-between p-4 rounded-xl border cursor-pointer transition-all hover:bg-surface-raised select-none"
        :class="modelValue === 'DINHEIRO' ? 'border-brand-green bg-brand-green/[0.02] shadow-sm ring-1 ring-brand-green' : 'border-border bg-surface'"
      >
        <div class="flex items-start justify-between mb-4">
          <div class="flex items-center gap-3">
            <input
              type="radio"
              name="formaPagamento"
              value="DINHEIRO"
              :checked="modelValue === 'DINHEIRO'"
              class="w-4 h-4 text-brand-green focus:ring-brand-green border-border"
              @click="emit('update:modelValue', 'DINHEIRO')"
            >
            <span class="text-sm font-bold text-text-primary">Dinheiro</span>
          </div>
          <img src="/icons/cash.svg" alt="Dinheiro" class="w-5 h-5 shrink-0">
        </div>
        <div class="mt-auto">
          <p class="text-xs text-text-secondary">Pague em mãos no ato da entrega</p>
        </div>
      </label>

      <!-- Cartão -->
      <label
        class="relative flex flex-col justify-between p-4 rounded-xl border cursor-pointer transition-all hover:bg-surface-raised select-none"
        :class="modelValue === 'CARTAO' ? 'border-brand-green bg-brand-green/[0.02] shadow-sm ring-1 ring-brand-green' : 'border-border bg-surface'"
      >
        <div class="flex items-start justify-between mb-4">
          <div class="flex items-center gap-3">
            <input
              type="radio"
              name="formaPagamento"
              value="CARTAO"
              :checked="modelValue === 'CARTAO'"
              class="w-4 h-4 text-brand-green focus:ring-brand-green border-border"
              @click="emit('update:modelValue', 'CARTAO')"
            >
            <span class="text-sm font-bold text-text-primary">Cartão</span>
          </div>
          <img src="/icons/card.svg" alt="Cartão" class="w-5 h-5 shrink-0">
        </div>
        <div class="mt-auto">
          <p class="text-xs text-text-secondary">Máquina de crédito/débito na entrega</p>
        </div>
      </label>
    </div>

    <!-- Validação inline de pagamento (aparece após tentar confirmar) -->
    <p
      v-if="tentouEnviar && !modelValue"
      class="text-xs text-red-500 mt-2 flex items-center gap-1"
    >
      <svg class="w-3 h-3 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>
      Escolha a forma de pagamento
    </p>
  </section>
</template>
