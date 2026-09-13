<!--
  @descricao: Lista de conversas com scroll, skeletons e estados vazios.
  @responsabilidade: Renderizar a coleção de conversas filtradas ou skeletons de carregamento.
-->

<script setup lang="ts">
import type { ChatConversation } from '#shared/types/chat'
import ChatConversationItem from './ChatConversationItem.vue'
import { MessageSquareDashed } from '@lucide/vue'

defineProps<{
  readonly conversations: readonly ChatConversation[]
  readonly activeConversationId: string | null
  readonly loading: boolean
}>()

const emit = defineEmits<{
  (e: 'select', clienteId: string): void
}>()
</script>

<template>
  <div class="flex-1 overflow-y-auto p-2 space-y-1 divide-y divide-border/20">
    <!-- Skeletons de Carregamento -->
    <template v-if="loading && conversations.length === 0">
      <div
        v-for="i in 6"
        :key="i"
        class="p-3 flex items-start gap-3 rounded-xl animate-pulse"
      >
        <div class="w-12 h-12 rounded-full bg-border/40 shrink-0" />
        <div class="flex-1 space-y-2 py-1">
          <div class="flex justify-between">
            <div class="h-3.5 bg-border/50 rounded w-28" />
            <div class="h-3 bg-border/30 rounded w-10" />
          </div>
          <div class="h-3 bg-border/30 rounded w-44" />
          <div class="h-4 bg-border/20 rounded w-20" />
        </div>
      </div>
    </template>

    <!-- Lista de Conversas -->
    <template v-else-if="conversations.length > 0">
      <ChatConversationItem
        v-for="conversation in conversations"
        :key="conversation.id"
        :conversation="conversation"
        :is-active="conversation.clienteId === activeConversationId"
        @select="(id) => emit('select', id)"
      />
    </template>

    <!-- Estado Vazio -->
    <div
      v-else
      class="h-full min-h-[260px] flex flex-col items-center justify-center p-6 text-center text-text-muted"
    >
      <div class="w-12 h-12 rounded-full bg-surface-raised border border-border flex items-center justify-center mb-3 text-text-muted">
        <MessageSquareDashed class="w-6 h-6" />
      </div>
      <p class="text-sm font-medium text-text-primary">
        Nenhuma conversa encontrada
      </p>
      <p class="text-xs text-text-muted mt-1 max-w-[220px]">
        Não há atendimentos correspondentes ao filtro ou busca selecionados.
      </p>
    </div>
  </div>
</template>
