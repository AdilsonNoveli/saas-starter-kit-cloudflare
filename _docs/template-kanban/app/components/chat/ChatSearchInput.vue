<!--
  @descricao: Campo de busca de conversas por nome, telefone ou mensagem.
  @responsabilidade: Entrada com debounce e botão de limpar.
-->

<script setup lang="ts">
import { Search, X } from '@lucide/vue'

defineProps<{
  readonly modelValue: string
  readonly placeholder?: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

const onInput = (event: Event) => {
  const target = event.target as HTMLInputElement
  emit('update:modelValue', target.value)
}

const clear = () => {
  emit('update:modelValue', '')
}
</script>

<template>
  <div class="relative w-full">
    <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-muted">
      <Search class="w-4 h-4" />
    </div>

    <input
      :value="modelValue"
      type="text"
      :placeholder="placeholder || 'Buscar por nome, telefone ou mensagem...'"
      class="w-full h-9 pl-9 pr-8 bg-surface-raised border border-border rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/20 transition-all"
      @input="onInput"
    >

    <button
      v-if="modelValue"
      type="button"
      class="absolute inset-y-0 right-0 pr-2.5 flex items-center text-text-muted hover:text-text-primary transition-colors cursor-pointer"
      title="Limpar busca"
      @click="clear"
    >
      <X class="w-4 h-4" />
    </button>
  </div>
</template>
