/**
 * Composable principal de orquestração de estado e ações do Chat Administrativo.
 *
 * Gerencia:
 *   - Lista de conversas, filtros (todos, atenção, humano, agente), busca reativa
 *   - Conversa ativa selecionada e histórico de mensagens
 *   - Estado de exibição da 3ª coluna (detalhes do cliente / pedidos)
 *   - Ações de envio, anexo de imagens S3, assumir controle manual e devolver ao agente
 *   - Integração com useNotification para confirmações e alertas
 */

import { ref, computed, watch } from 'vue'
import type {
  ChatConversation,
  ChatConversationsResponse,
  ChatMessage,
  ChatMessagesResponse,
  ChatCustomerContext,
  ChatFilterTab,
  SendChatMessagePayload,
} from '#shared/types/chat'
import { useNotification } from '~/composables/useNotification'
import { useChatRealtime } from '~/composables/useChatRealtime'

/** Espera a digitação parar antes de reconsultar o servidor (G3/G4 — busca agora é uma query real, não filtro em JS). */
const SEARCH_DEBOUNCE_MS = 300

export function useChat() {
  const { notify, confirm } = useNotification()

  // Estado geral — `conversations` já vem filtrado/ordenado pelo servidor
  // (server/utils/chat/chatService.ts, G3/G4): nunca mais um filtro em JS
  // sobre uma lista carregada inteira.
  const conversations = ref<ChatConversation[]>([])
  const tabCounts = ref<ChatConversationsResponse['counts']>({ all: 0, attention: 0, human: 0, agent: 0 })
  const activeConversationId = ref<string | null>(null)
  const messages = ref<ChatMessage[]>([])
  const hasMoreMessages = ref<boolean>(false)
  const loadingOlderMessages = ref<boolean>(false)
  const customerContext = ref<ChatCustomerContext | null>(null)
  const isDetailsPanelOpen = ref<boolean>(true)

  // Estados de carregamento
  const loadingConversations = ref<boolean>(false)
  const loadingMessages = ref<boolean>(false)
  const loadingContext = ref<boolean>(false)
  const sendingMessage = ref<boolean>(false)
  const togglingPause = ref<boolean>(false)

  // Filtros e busca
  const currentTab = ref<ChatFilterTab>('all')
  const searchQuery = ref<string>('')
  let searchDebounceTimer: ReturnType<typeof setTimeout> | undefined

  // Conversa ativa selecionada
  const activeConversation = computed<ChatConversation | null>(() => {
    if (!activeConversationId.value) return null
    return conversations.value.find((c) => c.clienteId === activeConversationId.value) ?? null
  })

  // Alias mantido pelo nome histórico consumido por ChatContainer.vue — o
  // dado em si já chega filtrado do servidor, não há mais filtragem local.
  const filteredConversations = conversations

  // Carrega a página atual de conversas para a aba/busca correntes.
  const fetchConversations = async () => {
    loadingConversations.value = true
    try {
      const data = await $fetch<ChatConversationsResponse>('/api/admin/chat/conversations', {
        query: { tab: currentTab.value, search: searchQuery.value.trim() },
      })
      conversations.value = [...data.data]
      tabCounts.value = data.counts
    } catch {
      // Falha suave de inicialização
    } finally {
      loadingConversations.value = false
    }
  }

  // Recarrega ao trocar de aba imediatamente; busca é debounced.
  watch(currentTab, () => { void fetchConversations() })
  watch(searchQuery, () => {
    if (searchDebounceTimer) clearTimeout(searchDebounceTimer)
    searchDebounceTimer = setTimeout(() => { void fetchConversations() }, SEARCH_DEBOUNCE_MS)
  })

  // Carrega histórico de mensagens da conversa ativa (as mais recentes — G2).
  const fetchMessages = async (clienteId: string) => {
    loadingMessages.value = true
    try {
      const data = await $fetch<ChatMessagesResponse>(`/api/admin/chat/${clienteId}/messages`)
      messages.value = [...data.data]
      hasMoreMessages.value = data.hasMore
    } catch {
      messages.value = []
      hasMoreMessages.value = false
    } finally {
      loadingMessages.value = false
    }
  }

  /**
   * Carrega mensagens mais antigas que a primeira já exibida (scroll para
   * cima) — cursor real via `before_seq` (§6.4 de `_docs/CHAT/PRD.md`, G2).
   */
  const loadOlderMessages = async () => {
    if (!activeConversationId.value || loadingOlderMessages.value || !hasMoreMessages.value) return
    const oldestSeq = messages.value[0]?.seq
    if (oldestSeq == null) return

    loadingOlderMessages.value = true
    try {
      const data = await $fetch<ChatMessagesResponse>(`/api/admin/chat/${activeConversationId.value}/messages`, {
        query: { before_seq: oldestSeq },
      })
      messages.value = [...data.data, ...messages.value]
      hasMoreMessages.value = data.hasMore
    } catch {
      // Mantém o que já está carregado — tentar de novo é seguro (idempotente).
    } finally {
      loadingOlderMessages.value = false
    }
  }

  // Carrega contexto detalhado do cliente e pedidos (3ª coluna)
  const fetchCustomerContext = async (clienteId: string) => {
    loadingContext.value = true
    try {
      const data = await $fetch<{ data: ChatCustomerContext }>(`/api/admin/chat/${clienteId}/context`)
      if (data?.data) {
        customerContext.value = data.data
      }
    } catch {
      customerContext.value = null
    } finally {
      loadingContext.value = false
    }
  }

  // Seleciona uma conversa
  const selectConversation = (clienteId: string) => {
    activeConversationId.value = clienteId
    void fetchMessages(clienteId)
    if (isDetailsPanelOpen.value) {
      void fetchCustomerContext(clienteId)
    }
  }

  // Alterna visibilidade da 3ª coluna
  const toggleDetailsPanel = () => {
    isDetailsPanelOpen.value = !isDetailsPanelOpen.value
    if (isDetailsPanelOpen.value && activeConversationId.value) {
      void fetchCustomerContext(activeConversationId.value)
    }
  }

  // Envio de mensagem
  const sendMessage = async (payload: SendChatMessagePayload) => {
    if (!activeConversationId.value) return false
    const clienteId = activeConversationId.value

    sendingMessage.value = true
    try {
      const res = await $fetch<{ success: boolean; data: ChatMessage }>(`/api/admin/chat/${clienteId}/messages`, {
        method: 'POST',
        body: payload,
      })

      if (res?.data) {
        messages.value.push(res.data)
        // Atualiza última mensagem na conversa local
        const conv = conversations.value.find((c) => c.clienteId === clienteId)
        if (conv) {
          const index = conversations.value.indexOf(conv)
          conversations.value[index] = {
            ...conv,
            lastMessage: res.data.displayText,
            lastMessageAt: res.data.criadoEm,
            lastMessageRole: 'assistant',
            lastMessagePrefixType: 'human_reply',
            pauseStatus: 'human_manual',
          }
        }
      }
      return true
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Não foi possível enviar a mensagem.'
      notify.error('Erro ao enviar mensagem', msg)
      return false
    } finally {
      sendingMessage.value = false
    }
  }

  // Ação: Assumir conversa (pausar agente IA)
  const takeoverConversation = async () => {
    if (!activeConversationId.value || !activeConversation.value) return
    const clienteId = activeConversationId.value

    const ok = await confirm({
      title: 'Assumir Atendimento',
      message: `Deseja pausar o Agente IA e assumir o atendimento de "${activeConversation.value.clienteNome}"? O agente deixará de responder automaticamente.`,
      variant: 'warning',
      confirmText: 'Assumir Conversa',
      cancelText: 'Cancelar',
    })

    if (!ok) return

    togglingPause.value = true
    try {
      await $fetch(`/api/admin/chat/${clienteId}/status`, {
        method: 'PUT',
        body: { action: 'pause', minutes: 15 },
      })

      notify.success('Atendimento assumido', 'O Agente IA foi pausado para este cliente.')

      const conv = conversations.value.find((c) => c.clienteId === clienteId)
      if (conv) {
        const idx = conversations.value.indexOf(conv)
        conversations.value[idx] = {
          ...conv,
          pauseStatus: 'human_manual',
        }
      }
    } catch {
      notify.error('Erro ao assumir atendimento', 'Tente novamente em instantes.')
    } finally {
      togglingPause.value = false
    }
  }

  // Ação: Devolver conversa ao Agente IA
  const returnToAgent = async () => {
    if (!activeConversationId.value || !activeConversation.value) return
    const clienteId = activeConversationId.value

    const ok = await confirm({
      title: 'Devolver ao Agente IA',
      message: `Deseja reativar o Agente IA para responder automaticamente às próximas mensagens de "${activeConversation.value.clienteNome}"?`,
      variant: 'info',
      confirmText: 'Reativar Agente',
      cancelText: 'Cancelar',
    })

    if (!ok) return

    togglingPause.value = true
    try {
      await $fetch(`/api/admin/chat/${clienteId}/status`, {
        method: 'PUT',
        body: { action: 'resume' },
      })

      notify.success('Agente IA reativado', 'O cliente voltou a ser atendido pelo Agente IA.')

      const conv = conversations.value.find((c) => c.clienteId === clienteId)
      if (conv) {
        const idx = conversations.value.indexOf(conv)
        conversations.value[idx] = {
          ...conv,
          pauseStatus: 'agent',
          pausadoAte: null,
          pausadoMotivo: null,
        }
      }
    } catch {
      notify.error('Erro ao reativar agente', 'Tente novamente em instantes.')
    } finally {
      togglingPause.value = false
    }
  }

  // Integração com o socket único da aplicação (useRealtimeSocket.ts)
  const { isConnected } = useChatRealtime({
    // Reconectou após queda — pode ter perdido eventos nesse intervalo:
    // revalida a inbox e, se houver conversa aberta, a thread ativa.
    onResync: () => {
      void fetchConversations()
      if (activeConversationId.value) void fetchMessages(activeConversationId.value)
    },
    onNewMessage: (newMsg) => {
      if (newMsg.clienteId === activeConversationId.value) {
        if (!messages.value.some((m) => m.id === newMsg.id)) {
          messages.value.push(newMsg)
        }
      }

      const conv = conversations.value.find((c) => c.clienteId === newMsg.clienteId)
      if (conv) {
        const idx = conversations.value.indexOf(conv)
        conversations.value[idx] = {
          ...conv,
          lastMessage: newMsg.displayText,
          lastMessageAt: newMsg.criadoEm,
          lastMessageRole: newMsg.role,
          lastMessagePrefixType: newMsg.prefixType,
          unreadCount: newMsg.clienteId === activeConversationId.value ? 0 : conv.unreadCount + 1,
        }
      } else {
        void fetchConversations()
      }
    },
    onConversationUpdated: (updated) => {
      const conv = conversations.value.find((c) => c.clienteId === updated.clienteId)
      if (conv) {
        const idx = conversations.value.indexOf(conv)
        conversations.value[idx] = {
          ...conv,
          ...updated,
        }
      }
    },
  })

  // Watcher para recarregar contexto ao abrir painel
  watch(isDetailsPanelOpen, (open) => {
    if (open && activeConversationId.value && !customerContext.value) {
      void fetchCustomerContext(activeConversationId.value)
    }
  })

  return {
    conversations,
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
    fetchMessages,
    loadOlderMessages,
    fetchCustomerContext,
    selectConversation,
    toggleDetailsPanel,
    sendMessage,
    takeoverConversation,
    returnToAgent,
  }
}
