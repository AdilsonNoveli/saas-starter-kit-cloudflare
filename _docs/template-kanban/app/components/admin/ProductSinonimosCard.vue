<!--
  @descricao: Card "Busca por IA" (sinônimos do produto).
  @objetivo: Termos alternativos (sinônimos, apelidos, variações) usados
    pela busca por LLM — extraído de `[id].vue` (Card 2). Autocontido: não
    precisa de composable própria, só o array via `defineModel`.
-->

<script setup lang="ts">
import { ref } from 'vue'
import { Sparkles, X } from '@lucide/vue'

const sinonimos = defineModel<string[]>({ required: true })

const sinonimoQuery = ref('')

function addSinonimo(): void {
  const v = sinonimoQuery.value.trim().toLowerCase()
  if (v && !sinonimos.value.includes(v) && sinonimos.value.length < 20) {
    sinonimos.value.push(v)
  }
  sinonimoQuery.value = ''
}

function handleSinonimosKeydown(e: KeyboardEvent): void {
  if (e.key === ',' || e.key === 'Enter') {
    e.preventDefault()
    addSinonimo()
  } else if (e.key === 'Backspace' && sinonimoQuery.value === '' && sinonimos.value.length > 0) {
    sinonimos.value.pop()
  }
}

/** Commita um termo digitado-mas-não-confirmado antes do save da página. */
function flushPending(): void {
  addSinonimo()
}

defineExpose({ flushPending })
</script>

<template>
  <div class="border border-border bg-surface-raised p-5 space-y-4 rounded-md">
    <div class="flex items-center gap-2 border-b border-border pb-3">
      <Sparkles class="w-4.5 h-4.5 text-brand-green" />
      <h3 class="text-sm font-bold text-text-primary uppercase tracking-wider">Busca por IA</h3>
    </div>

    <p class="text-xs text-text-muted mt-0.5">Termos alternativos para este item (sinônimos, apelidos e variações).</p>

    <div class="bg-surface rounded-lg border border-border p-3 space-y-2">
      <div class="flex flex-wrap gap-1.5 min-h-[2rem] items-center">
        <!-- Chips de sinônimos -->
        <span
          v-for="(tag, ti) in sinonimos"
          :key="ti"
          class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-700 border border-primary-200"
        >
          {{ tag }}
          <button
            type="button"
            class="text-primary-400 hover:text-primary-700 transition-colors ml-0.5"
            :aria-label="`Remover sinônimo ${tag}`"
            @click="sinonimos = sinonimos.filter((_, i) => i !== ti)"
          >
            <X class="w-3 h-3" />
          </button>
        </span>

        <!-- Input de novo sinônimo -->
        <input
          v-if="sinonimos.length < 20"
          id="prod-sinonimos-input"
          v-model="sinonimoQuery"
          type="text"
          class="flex-1 min-w-[120px] text-xs text-text-primary bg-transparent placeholder:text-text-muted outline-none"
          placeholder="Adicione termo..."
          aria-label="Adicionar sinônimo"
          @keydown="handleSinonimosKeydown"
          @blur="addSinonimo"
        >
      </div>
    </div>
    <p class="text-[10px] text-text-muted leading-tight">
      Digite e aperte <kbd class="px-1 py-0.2 rounded bg-surface border border-border text-[9px] font-mono">Enter</kbd> ou <kbd class="px-1 py-0.2 rounded bg-surface border border-border text-[9px] font-mono">,</kbd> para salvar. Máx. 20 termos.
    </p>
  </div>
</template>
