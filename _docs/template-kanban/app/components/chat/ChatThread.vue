<!--
  @descricao: Coluna 2 do Chat — Visão da Conversa Ativa (Thread).
  @responsabilidade: Integrar cabeçalho da thread, banner de status, histórico e composer.
-->

<script setup lang="ts">
import type {
  ChatConversation,
  ChatMessage,
  SendChatMessagePayload,
} from '#shared/types/chat'
import ChatThreadHeader from './ChatThreadHeader.vue'
import ChatTakeoverBanner from './ChatTakeoverBanner.vue'
import ChatMessageList from './ChatMessageList.vue'
import ChatComposer from './ChatComposer.vue'

defineProps<{
  readonly conversation: ChatConversation
  readonly messages: readonly ChatMessage[]
  readonly loadingMessages: boolean
  readonly sendingMessage: boolean
  readonly togglingPause: boolean
  readonly isDetailsOpen: boolean
  readonly hasMoreMessages?: boolean
  readonly loadingOlderMessages?: boolean
}>()

const emit = defineEmits<{
  takeover: []
  returnToAgent: []
  toggleDetails: []
  back: []
  send: [payload: SendChatMessagePayload]
  loadOlder: []
}>()
</script>

<template>
  <main class="flex-1 h-full flex flex-col bg-surface min-w-0 overflow-hidden relative">
    <!-- Cabeçalho da Conversa -->
    <ChatThreadHeader
      :conversation="conversation"
      :is-details-open="isDetailsOpen"
      :toggling-pause="togglingPause"
      @takeover="emit('takeover')"
      @return-to-agent="emit('returnToAgent')"
      @toggle-details="emit('toggleDetails')"
      @back="emit('back')"
    />

    <!-- Banner de Estado de Controle (Humano vs IA vs Transbordo) -->
    <ChatTakeoverBanner
      :pause-status="conversation.pauseStatus"
      :pausado-ate="conversation.pausadoAte"
      :pausado-motivo="conversation.pausadoMotivo"
      @takeover="emit('takeover')"
      @return-to-agent="emit('returnToAgent')"
    />

    <!-- Área de Mensagens com Scroll e Separação por Datas -->
    <ChatMessageList
      :messages="messages"
      :loading="loadingMessages"
      :has-more="hasMoreMessages"
      :loading-older="loadingOlderMessages"
      @load-older="emit('loadOlder')"
    />

    <!-- Rodapé de Composição e Envio -->
    <ChatComposer
      :conversation="conversation"
      :sending="sendingMessage"
      :has-valid-recipient="Boolean(conversation.clienteTelefone)"
      @send="(payload) => emit('send', payload)"
    />
  </main>
</template>
