/**
 * Composable de escuta de eventos em tempo real do Chat — consome o socket
 * único da aplicação (`useRealtimeSocket.ts`), nunca abre conexão própria.
 * Antes assinava `postgres_changes` do Supabase Realtime diretamente; trocado
 * por questão de custo (decisão registrada em `_docs/CHAT/PRD.md`). Interface
 * pública mantida idêntica (`onNewMessage`/`onConversationUpdated`) — nada
 * muda em `useChat.ts` além da fonte do evento.
 */
import { onMounted, onUnmounted } from 'vue'
import { useRealtimeSocket } from '~/composables/useRealtimeSocket'
import { parseChatMessage } from '#shared/utils/chatMessage'
import { deriveChatPauseStatus } from '#shared/utils/chatPauseStatus'
import type { ChatMessage, ChatConversation, ChatMessageActor, ChatChannel } from '#shared/types/chat'
import type { ChatMessageRealtimeEvent, ChatConversationUpdatedRealtimeEvent } from '#shared/types/realtime'

interface UseChatRealtimeOptions {
  readonly onNewMessage?: (message: ChatMessage) => void
  readonly onConversationUpdated?: (conversation: Partial<ChatConversation> & { clienteId: string }) => void
  /** Disparado ao reconectar — sinal para revalidar dado que pode ter sido perdido durante a queda. */
  readonly onResync?: () => void
}

export function useChatRealtime(options: UseChatRealtimeOptions = {}) {
  const { isConnected, subscribe, unsubscribe, onResync } = useRealtimeSocket()

  const handleMessage = (event: ChatMessageRealtimeEvent): void => {
    const raw = event.payload
    const parsed = parseChatMessage({
      role: raw.role,
      content: raw.content,
      actor: (raw.ator ?? undefined) as ChatMessageActor | undefined,
    })

    options.onNewMessage?.({
      id: raw.id,
      conversationId: raw.clienteId,
      clienteId: raw.clienteId,
      role: raw.role,
      content: raw.content,
      displayText: parsed.displayText,
      prefixType: parsed.prefixType,
      criadoEm: raw.criadoEm,
      seq: raw.seq,
      isFromStaff: parsed.isFromStaff,
      isFromAgent: parsed.isFromAgent,
      status: raw.status as ChatMessage['status'],
      actor: (raw.ator ?? undefined) as ChatMessageActor | undefined,
      channel: (raw.channel ?? 'whatsapp') as ChatChannel,
      wamid: raw.wamid,
      toolsUsed: raw.toolsUsed,
    })
  }

  const handleConversationUpdated = (event: ChatConversationUpdatedRealtimeEvent): void => {
    const raw = event.payload
    const pauseStatus = deriveChatPauseStatus({ pausadoAte: raw.pausadoAte, pausadoMotivo: raw.pausadoMotivo })

    options.onConversationUpdated?.({
      clienteId: raw.clienteId,
      pausadoAte: raw.pausadoAte,
      pausadoMotivo: raw.pausadoMotivo,
      pauseStatus,
    })
  }

  let cancelResync: (() => void) | undefined

  onMounted(() => {
    subscribe('chat.message', handleMessage)
    subscribe('chat.conversation_updated', handleConversationUpdated)
    if (options.onResync) cancelResync = onResync(options.onResync)
  })

  onUnmounted(() => {
    unsubscribe('chat.message', handleMessage)
    unsubscribe('chat.conversation_updated', handleConversationUpdated)
    cancelResync?.()
  })

  return { isConnected }
}
