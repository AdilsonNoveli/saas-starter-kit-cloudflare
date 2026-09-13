<script setup lang="ts">
import { Shield } from '@lucide/vue'

/**
 * Passo 1 do checkout: coleta de WhatsApp antes de liberar o formulário de
 * pedido. Extraído de `checkout.vue` (god component).
 */
defineProps<{
  modelValue: string
  loading: boolean
  errorMsg: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'submit'): void
}>()

// Máscara simples para UX (remove letras, formata DDD e Número)
function applyMask(event: Event): void {
  const input = event.target as HTMLInputElement
  let value = input.value.replace(/\D/g, '')

  if (value.length > 11) value = value.slice(0, 11)

  if (value.length > 2) {
    value = `(${value.slice(0, 2)}) ${value.slice(2)}`
  }
  if (value.length > 10) {
    value = `${value.slice(0, 10)}-${value.slice(10)}`
  }

  emit('update:modelValue', value)
}
</script>

<template>
  <main class="px-4 lg:px-0 pt-4 lg:pt-0 pb-7 space-y-8 flex-1 animate-in fade-in duration-300 w-full">
    <section>
      <div class="bg-surface p-6 md:p-8 rounded-xl border border-border">
        <p class="text-text-muted mb-6 text-center text-sm leading-relaxed px-1">
          Informe seu <span style="font-family: 'Inter', system-ui, sans-serif;">WhatsApp</span> para concluir seu pedido e receber todas as atualizações.
        </p>

        <form class="space-y-4" @submit.prevent="emit('submit')">
          <div>
            <label for="whatsapp-input" class="block text-xs font-bold text-text-primary uppercase tracking-wider mb-2">Seu Número com DDD</label>
            <div class="relative">
              <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-muted font-medium">
                +55
              </div>
              <input
                id="whatsapp-input"
                :value="modelValue"
                type="tel"
                placeholder="(11) 99999-9999"
                class="w-full pl-12 pr-4 py-3.5 rounded-lg border border-border focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-surface-raised focus:bg-surface text-lg font-medium text-text-primary placeholder-text-muted"
                :disabled="loading"
                autofocus
                @input="applyMask"
              >
            </div>
            <p v-if="errorMsg" class="mt-2 text-sm text-red-500 font-medium flex items-center gap-1 animate-pulse">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              {{ errorMsg }}
            </p>
          </div>
        </form>

        <!-- Security Notice Footer (Shopify Style) -->
        <div class="mt-8 pt-6 border-t border-border flex items-start gap-3 text-left">
          <Shield class="w-5 h-5 text-brand-green shrink-0 mt-0.5" stroke-width="2" />
          <p class="text-xs text-text-secondary leading-relaxed">
            Seu <span style="font-family: 'Inter', system-ui, sans-serif;">WhatsApp</span> será utilizado apenas para confirmar o pedido e enviar informações sobre a entrega.
          </p>
        </div>
      </div>
    </section>
  </main>
</template>
