<!--
  @descricao: Banner contextual de estado da conversa (Modo Humano vs Agente IA vs Transbordo).
  @responsabilidade: Informar claramente ao operador quem está no controle da conversa no momento.
-->

<script setup lang="ts">
import { computed } from 'vue'
import type { ChatPauseStatus } from '#shared/types/chat'
import { Bot, User, AlertCircle, Clock } from '@lucide/vue'

const props = defineProps<{
  readonly pauseStatus: ChatPauseStatus
  readonly pausadoAte: string | null
  readonly pausadoMotivo: string | null
}>()

const emit = defineEmits<{
  returnToAgent: []
  takeover: []
}>()

const formattedExpiry = computed<string>(() => {
  if (!props.pausadoAte) return ''
  const date = new Date(props.pausadoAte)
  if (isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
})
</script>

<template>
  <div
    v-if="pauseStatus === 'transbordo'"
    class="px-4 py-2 bg-red-500/10 border-b border-red-500/20 text-red-700 dark:text-red-300 flex items-center justify-between gap-3 text-xs shrink-0 select-none"
  >
    <div class="flex items-center gap-2 min-w-0">
      <AlertCircle class="w-4 h-4 text-red-500 shrink-0" />
      <span class="truncate">
        <strong>Atenção:</strong> Transbordo identificado — o cliente necessita de atendimento humano.
      </span>
    </div>
    <button
      type="button"
      class="px-2.5 py-1 rounded bg-red-500 text-white font-medium hover:bg-red-600 transition-colors shrink-0 cursor-pointer shadow-xs"
      @click="emit('takeover')"
    >
      Atender Agora
    </button>
  </div>

  <div
    v-else-if="pauseStatus === 'human_manual' || pauseStatus === 'human_echo'"
    class="px-4 py-2 bg-blue-500/10 border-b border-blue-500/20 text-blue-700 dark:text-blue-300 flex items-center justify-between gap-3 text-xs shrink-0 select-none"
  >
    <div class="flex items-center gap-2 min-w-0">
      <User class="w-4 h-4 text-blue-500 shrink-0" />
      <span class="truncate">
        <strong>Atendimento Humano Ativo:</strong>
        {{ pauseStatus === 'human_echo' ? 'Resposta enviada pelo celular.' : 'Você assumiu a conversa no painel.' }}
        <span v-if="formattedExpiry" class="inline-flex items-center gap-0.5 ml-1 opacity-80">
          <Clock class="w-3 h-3" /> até {{ formattedExpiry }}
        </span>
      </span>
    </div>
    <button
      type="button"
      class="px-2.5 py-1 rounded bg-blue-500 text-white font-medium hover:bg-blue-600 transition-colors shrink-0 cursor-pointer shadow-xs"
      @click="emit('returnToAgent')"
    >
      Devolver ao Agente
    </button>
  </div>

  <div
    v-else
    class="px-4 py-1.5 bg-surface-raised/80 border-b border-border text-text-muted flex items-center justify-between gap-3 text-[11px] shrink-0 select-none"
  >
    <div class="flex items-center gap-1.5">
      <Bot class="w-3.5 h-3.5 text-emerald-500 shrink-0" />
      <span>Agente IA respondendo automaticamente às mensagens deste cliente.</span>
    </div>
    <button
      type="button"
      class="text-brand hover:underline font-medium cursor-pointer"
      @click="emit('takeover')"
    >
      Assumir atendimento
    </button>
  </div>
</template>
