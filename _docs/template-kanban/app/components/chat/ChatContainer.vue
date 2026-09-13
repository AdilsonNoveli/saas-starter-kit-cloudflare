<!--
  @descricao: Container mestre do Chat (estilo WhatsApp Web).
  @responsabilidade: Orquestrar as 2 ou 3 colunas, responsividade móvel e conectar com useChat.
-->

<script setup lang="ts">
import { onMounted } from 'vue'
import { useChat } from '~/composables/useChat'
import ChatSidebar from './ChatSidebar.vue'
import ChatThread from './ChatThread.vue'
import ChatDetailsSidebar from './ChatDetailsSidebar.vue'
import ChatEmptyState from './ChatEmptyState.vue'

const {
  filteredConversations,
  activeConversationId,
  activeConversation,
  messages,
  hasMoreMessages,
  loadingOlderMessages,
  customerContext,
  isConnected,
  isDetailsPanelOpen,
  loadingConversations,
  loadingMessages,
  loadingContext,
  sendingMessage,
  togglingPause,
  currentTab,
  searchQuery,
  tabCounts,
  fetchConversations,
  loadOlderMessages,
  selectConversation,
  toggleDetailsPanel,
  sendMessage,
  takeoverConversation,
  returnToAgent,
} = useChat()

// Ao montar, carrega a lista de conversas
onMounted(() => {
  void fetchConversations()
})

const handleBackToInbox = () => {
  activeConversationId.value = null
}
</script>

<template>
  <div class="w-full h-full flex bg-surface overflow-hidden relative">
    <!-- Coluna 1: Barra Lateral de Conversas (Inbox) -->
    <ChatSidebar
      class="transition-all duration-300"
      :class="[
        activeConversationId ? 'max-md:hidden' : 'max-md:w-full',
      ]"
      :conversations="filteredConversations"
      :active-conversation-id="activeConversationId"
      :active-tab="currentTab"
      :search-query="searchQuery"
      :tab-counts="tabCounts"
      :loading="loadingConversations"
      :is-connected="isConnected"
      @select-conversation="selectConversation"
      @update-search="(q) => (searchQuery = q)"
      @select-tab="(tab) => (currentTab = tab)"
      @refresh="fetchConversations"
    />

    <!-- Coluna 2: Thread da Conversa Ativa OU Estado Vazio -->
    <div
      class="flex-1 h-full min-w-0 flex overflow-hidden"
      :class="[
        !activeConversationId ? 'max-md:hidden' : 'max-md:w-full',
      ]"
    >
      <ChatThread
        v-if="activeConversation"
        :conversation="activeConversation"
        :messages="messages"
        :loading-messages="loadingMessages"
        :sending-message="sendingMessage"
        :toggling-pause="togglingPause"
        :is-details-open="isDetailsPanelOpen"
        :has-more-messages="hasMoreMessages"
        :loading-older-messages="loadingOlderMessages"
        @takeover="takeoverConversation"
        @return-to-agent="returnToAgent"
        @toggle-details="toggleDetailsPanel"
        @back="handleBackToInbox"
        @send="sendMessage"
        @load-older="loadOlderMessages"
      />

      <ChatEmptyState v-else />
    </div>

    <!-- Coluna 3: Barra Lateral Retrátil de Detalhes (Cliente / Pedidos) -->
    <Transition
      enter-active-class="transition-all duration-300 ease-out"
      enter-from-class="opacity-0 translate-x-12"
      enter-to-class="opacity-100 translate-x-0"
      leave-active-class="transition-all duration-200 ease-in"
      leave-from-class="opacity-100 translate-x-0"
      leave-to-class="opacity-0 translate-x-12"
    >
      <ChatDetailsSidebar
        v-if="isDetailsPanelOpen && activeConversation"
        class="max-lg:fixed max-lg:inset-y-0 max-lg:right-0 max-lg:shadow-2xl"
        :context="customerContext"
        :loading="loadingContext"
        @close="toggleDetailsPanel"
      />
    </Transition>
  </div>
</template>
