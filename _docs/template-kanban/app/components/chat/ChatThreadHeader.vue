<!--
  @descricao: Cabeçalho superior da conversa ativa (Thread Header).
  @responsabilidade: Identificação do cliente, status do agente, botões de ação e alternância da 3ª coluna com ícones chevron-right / chevron-left.
-->

<script setup lang="ts">
import { computed } from 'vue'
import type { ChatConversation } from '#shared/types/chat'
import {
  ChevronRight,
  ChevronLeft,
  UserCheck,
  RotateCcw,
  ArrowLeft,
} from '@lucide/vue'

const props = defineProps<{
  readonly conversation: ChatConversation
  readonly isDetailsOpen: boolean
  readonly togglingPause: boolean
}>()

const emit = defineEmits<{
  takeover: []
  returnToAgent: []
  toggleDetails: []
  back: []
}>()

const initials = computed<string>(() => {
  const parts = (props.conversation.clienteNome || 'Cliente').trim().split(' ').filter(Boolean)
  if (parts.length === 0) return 'CL'
  if (parts.length === 1) return (parts[0]?.substring(0, 2) ?? 'CL').toUpperCase()
  return ((parts[0]?.[0] ?? '') + (parts[parts.length - 1]?.[0] ?? '')).toUpperCase()
})

const isPaused = computed<boolean>(() => {
  return (
    props.conversation.pauseStatus === 'human_manual' ||
    props.conversation.pauseStatus === 'human_echo' ||
    props.conversation.pauseStatus === 'transbordo'
  )
})
</script>

<template>
  <header class="h-16 px-4 flex items-center justify-between border-b border-border bg-surface shrink-0 select-none z-10">
    <div class="flex items-center gap-3 min-w-0">
      <!-- Botão Voltar (Mobile) -->
      <button
        type="button"
        class="w-8 h-8 rounded-lg border border-border flex items-center justify-center text-text-muted hover:text-text-primary md:hidden cursor-pointer shrink-0"
        title="Voltar para conversas"
        @click="emit('back')"
      >
        <ArrowLeft class="w-4 h-4" />
      </button>

      <!-- Avatar do Cliente -->
      <div class="w-10 h-10 rounded-full bg-brand/10 text-brand font-semibold flex items-center justify-center border border-border shrink-0 overflow-hidden text-sm">
        <img
          v-if="conversation.clienteAvatar"
          :src="conversation.clienteAvatar"
          :alt="conversation.clienteNome"
          class="w-full h-full object-cover"
        >
        <span v-else>{{ initials }}</span>
      </div>

      <!-- Informações do Cliente -->
      <div class="min-w-0">
        <div class="flex items-center gap-2">
          <h2 class="font-semibold text-sm text-text-primary truncate">
            {{ conversation.clienteNome || 'Cliente sem nome' }}
          </h2>

          <span
            v-if="conversation.pauseStatus === 'transbordo'"
            class="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/20"
          >
            Atenção
          </span>
        </div>

        <div class="flex items-center gap-2 text-xs text-text-muted">
          <span>{{ conversation.clienteTelefone || 'Sem telefone' }}</span>
          <span class="inline-block w-1 h-1 rounded-full bg-text-muted/40" />
          <span class="capitalize">{{ conversation.channel }}</span>
        </div>
      </div>
    </div>

    <!-- Ações do Cabeçalho -->
    <div class="flex items-center gap-2">
      <!-- Botão: Devolver ao Agente (quando está pausado/humano) -->
      <button
        v-if="isPaused"
        type="button"
        class="h-8 px-3 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
        :disabled="togglingPause"
        title="Reativar o Agente IA para responder automaticamente"
        @click="emit('returnToAgent')"
      >
        <RotateCcw class="w-3.5 h-3.5" :class="{ 'animate-spin': togglingPause }" />
        <span class="hidden sm:inline">Devolver ao Agente</span>
      </button>

      <!-- Botão: Assumir Conversa (quando está no Agente) -->
      <button
        v-else
        type="button"
        class="h-8 px-3 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
        :disabled="togglingPause"
        title="Pausar o Agente IA e assumir o atendimento"
        @click="emit('takeover')"
      >
        <UserCheck class="w-3.5 h-3.5" :class="{ 'animate-spin': togglingPause }" />
        <span class="hidden sm:inline">Assumir Conversa</span>
      </button>

      <!-- Botão: Alternar 3ª Coluna com ícones chevron-right / chevron-left -->
      <button
        type="button"
        class="w-8 h-8 rounded-lg border flex items-center justify-center transition-all cursor-pointer shadow-2xs"
        :class="[
          isDetailsOpen
            ? 'bg-brand/10 text-brand border-brand/30 hover:bg-brand/20'
            : 'border-border text-text-muted hover:text-text-primary hover:bg-surface-raised',
        ]"
        :title="isDetailsOpen ? 'Ocultar detalhes (Chevron Right)' : 'Exibir detalhes (Chevron Left)'"
        :aria-label="isDetailsOpen ? 'Ocultar detalhes' : 'Exibir detalhes'"
        @click="emit('toggleDetails')"
      >
        <ChevronRight v-if="isDetailsOpen" class="w-4 h-4" />
        <ChevronLeft v-else class="w-4 h-4" />
      </button>
    </div>
  </header>
</template>
