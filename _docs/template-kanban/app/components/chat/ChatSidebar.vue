<!--
  @descricao: Coluna 1 do Chat — Barra Lateral de Conversas (Inbox).
  @responsabilidade: Integrar cabeçalho, busca, abas de filtro e lista de conversas.
-->

<script setup lang="ts">
import type { ChatConversation, ChatFilterTab } from '#shared/types/chat'
import ChatSidebarHeader from './ChatSidebarHeader.vue'
import ChatSearchInput from './ChatSearchInput.vue'
import ChatFilterTabs from './ChatFilterTabs.vue'
import ChatConversationList from './ChatConversationList.vue'

defineProps<{
  readonly conversations: readonly ChatConversation[]
  readonly activeConversationId: string | null
  readonly activeTab: ChatFilterTab
  readonly searchQuery: string
  readonly tabCounts: {
    readonly all: number
    readonly attention: number
    readonly human: number
    readonly agent: number
  }
  readonly loading: boolean
  readonly isConnected: boolean
}>()

const emit = defineEmits<{
  selectConversation: [clienteId: string]
  updateSearch: [query: string]
  selectTab: [tab: ChatFilterTab]
  refresh: []
}>()
</script>

<template>
  <aside class="w-full md:w-[360px] lg:w-[380px] h-full flex flex-col bg-surface border-r border-border shrink-0 select-none overflow-hidden">
    <!-- Cabeçalho com status realtime e refresh -->
    <ChatSidebarHeader
      :is-connected="isConnected"
      :loading="loading"
      @refresh="emit('refresh')"
    />

    <!-- Área de busca e filtros clear -->
    <div class="px-3 pt-3 pb-0 space-y-2 bg-surface">
      <ChatSearchInput
        :model-value="searchQuery"
        @update:model-value="(val) => emit('updateSearch', val)"
      />

      <ChatFilterTabs
        :active-tab="activeTab"
        :counts="tabCounts"
        @select="(tab) => emit('selectTab', tab)"
      />
    </div>

    <!-- Lista de Conversas -->
    <ChatConversationList
      :conversations="conversations"
      :active-conversation-id="activeConversationId"
      :loading="loading"
      @select="(id) => emit('selectConversation', id)"
    />
  </aside>
</template>
