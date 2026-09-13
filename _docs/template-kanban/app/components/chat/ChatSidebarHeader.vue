<!--
  @descricao: Cabeçalho da barra lateral de conversas (Inbox Header Clear).
  @responsabilidade: Exibir título, status de conexão realtime sutil e botão de atualização.
-->

<script setup lang="ts">
import { RefreshCw } from '@lucide/vue'

defineProps<{
  readonly isConnected: boolean
  readonly loading: boolean
}>()

const emit = defineEmits<{
  refresh: []
}>()
</script>

<template>
  <header class="h-16 px-4 flex items-center justify-between border-b border-border bg-surface shrink-0 select-none">
    <div class="flex items-center gap-2.5">
      <div class="flex items-center gap-2">
        <span
          class="w-2 h-2 rounded-full shrink-0"
          :class="isConnected ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-amber-500'"
          :title="isConnected ? 'Realtime conectado' : 'Conectando ao realtime...'"
        />
        <h1 class="font-bold text-base text-text-primary tracking-tight">
          Atendimento
        </h1>
      </div>
      <span class="text-xs text-text-muted font-normal">
        {{ isConnected ? 'online' : 'conectando' }}
      </span>
    </div>

    <!-- Botão de Atualizar Clear -->
    <button
      type="button"
      class="w-8 h-8 rounded-lg flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-surface-raised transition-colors active:scale-95 cursor-pointer disabled:opacity-50"
      :disabled="loading"
      title="Atualizar conversas"
      aria-label="Atualizar conversas"
      @click="emit('refresh')"
    >
      <RefreshCw
        class="w-4 h-4"
        :class="{ 'animate-spin': loading }"
      />
    </button>
  </header>
</template>
