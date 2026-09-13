/**
 * Contratos de tipos compartilhados para o Sistema de Chat Agnóstico (Fase 6.5).
 *
 * Suporta múltiplos canais (WhatsApp, Instagram, Telegram, Custom) com
 * tipagem estrita (zero `any`), separação clara de papéis e estados de pausa.
 */

/** Canais de comunicação suportados / extensíveis */
export const CHAT_CHANNELS = [
  'whatsapp',
  'instagram',
  'telegram',
  'custom',
] as const
export type ChatChannel = (typeof CHAT_CHANNELS)[number]

/** Papéis de remetente da mensagem */
export const CHAT_ROLES = [
  'user',       // Cliente final
  'assistant',  // Resposta da loja / agente
  'agent',      // Agente IA especificamente
  'human',      // Atendente humano especificamente
  'system',     // Mensagens do sistema / auditoria
] as const
export type ChatRole = (typeof CHAT_ROLES)[number]

/** Estado de controle/pausa do atendimento da conversa */
export const CHAT_PAUSE_STATUSES = [
  'agent',         // Agente IA ativo e respondendo
  'human_manual',  // Loja assumiu manualmente no painel
  'human_echo',    // Atendente respondeu pelo app do celular (echo)
  'transbordo',    // Transbordo detectado (aguardando atenção humana)
] as const
export type ChatPauseStatus = (typeof CHAT_PAUSE_STATUSES)[number]

/** Status de entrega da mensagem */
export type ChatMessageDeliveryStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'failed'

/** Tipo de prefixo especial detectado no conteúdo da mensagem */
export type ChatMessagePrefixType = 'text' | 'audio_transcript' | 'image_description' | 'human_reply'

/**
 * Autoria explícita da mensagem (`whatsapp_conversas.ator`, migration 115) —
 * substitui a inferência por prefixo de texto (G1/G10 de `_docs/CHAT/PRD.md`).
 * `undefined`/ausente = linha gravada antes da migration 115 (heurística de
 * prefixo aplicada em `shared/utils/chatMessage.ts`).
 */
export const CHAT_MESSAGE_ACTORS = ['cliente', 'agente_ia', 'humano_painel', 'humano_celular', 'sistema'] as const
export type ChatMessageActor = (typeof CHAT_MESSAGE_ACTORS)[number]

/** Anexo de mídia da mensagem (armazenado via S3) */
export interface ChatAttachment {
  readonly id: string
  readonly url: string
  readonly key: string
  readonly mimeType: string
  readonly fileName: string
  readonly fileSize?: number
  readonly thumbnailUrl?: string
}

/** Modelo da Mensagem do Chat */
export interface ChatMessage {
  readonly id: string
  readonly conversationId: string
  readonly clienteId: string
  readonly role: 'user' | 'assistant'
  /** Conteúdo cru conforme gravado no banco */
  readonly content: string
  /** Texto limpo para exibição na UI (sem os colchetes dos prefixos) */
  readonly displayText: string
  /** Tipo de conteúdo especial derivado */
  readonly prefixType: ChatMessagePrefixType
  /** Anexos de imagem / mídia (se houver) */
  readonly attachments?: readonly ChatAttachment[]
  /** Data e hora de criação (ISO string) */
  readonly criadoEm: string
  /** Número sequencial para ordenação estável */
  readonly seq?: number
  /** Identifica se a mensagem foi enviada por atendente humano (painel ou celular) */
  readonly isFromStaff: boolean
  /** Identifica se a mensagem foi gerada pelo Agente IA */
  readonly isFromAgent: boolean
  /** Status de entrega da mensagem */
  readonly status?: ChatMessageDeliveryStatus
  /** Nome do atendente que enviou (quando disponível) */
  readonly staffName?: string
  /** Autoria explícita (migration 115) — ausente em linhas gravadas antes dela. */
  readonly actor?: ChatMessageActor
  /** Canal de origem (migration 116). */
  readonly channel?: ChatChannel
  /** Id da mensagem na Cloud API — usado para dedupe contra echo (G6). */
  readonly wamid?: string | null
  /** Nomes das tools chamadas pelo Agente IA neste turno (`agente_uso_tokens.tool_trace`, migration 106). Ausente/vazio quando não houve tool call ou a mensagem não é do agente. */
  readonly toolsUsed?: readonly string[]
}

/** Resumo da Conversa (Item da Inbox / Lista) */
export interface ChatConversation {
  readonly id: string
  readonly clienteId: string
  readonly clienteNome: string
  readonly clienteTelefone: string | null
  readonly clienteAvatar?: string | null
  readonly channel: ChatChannel
  readonly lastMessage: string
  readonly lastMessageAt: string
  readonly lastMessageRole: 'user' | 'assistant'
  readonly lastMessagePrefixType: ChatMessagePrefixType
  readonly unreadCount: number
  readonly pauseStatus: ChatPauseStatus
  readonly pausadoAte: string | null
  readonly pausadoMotivo: string | null
  readonly isOnline?: boolean
  readonly possuiPendencias?: boolean
}

/** Endereço do cliente para a coluna lateral de detalhes */
export interface ChatCustomerAddress {
  readonly id: string
  readonly rua: string | null
  readonly numero: string | null
  readonly complemento: string | null
  readonly bairro: string | null
  readonly cidade: string | null
  readonly estado: string | null
  readonly cep: string | null
  readonly padrao: boolean
}

/** Item de pedido resumido para a coluna lateral de detalhes */
export interface ChatCustomerOrderItem {
  readonly id: string
  readonly produtoNome: string
  readonly quantidade: number
  readonly precoUnitario: number
  readonly subtotal: number
}

/** Resumo de pedido para a coluna lateral de detalhes */
export interface ChatCustomerOrderSummary {
  readonly id: string
  readonly numeroSequencial: number | null
  readonly criadoEm: string
  readonly status: string
  readonly statusLabel: string
  readonly statusColor: string
  readonly valorTotal: number
  readonly tipoEntrega: string | null
  readonly formaPagamento: string | null
  readonly itens: readonly ChatCustomerOrderItem[]
}

/** Contexto completo do Cliente e Pedidos (3ª Coluna do Chat) */
export interface ChatCustomerContext {
  readonly id: string
  readonly nome: string
  readonly telefoneWhatsapp: string | null
  readonly whatsappLid: string | null
  readonly isVisitante: boolean
  readonly clienteDesde: string | null
  readonly observacoesInternas: string | null
  readonly totalPedidos: number
  readonly valorGastoAcumulado: number
  readonly frequenciaCompra: string | null
  readonly ultimoPedidoEm: string | null
  readonly enderecos: readonly ChatCustomerAddress[]
  readonly pedidosRecentes: readonly ChatCustomerOrderSummary[]
}

/** Filtros da lista de conversas */
export const CHAT_FILTER_TABS = ['all', 'attention', 'human', 'agent'] as const
export type ChatFilterTab = (typeof CHAT_FILTER_TABS)[number]

export interface ChatFilterState {
  readonly tab: ChatFilterTab
  readonly search: string
  readonly channel?: ChatChannel | 'all'
}

/** Payload para envio de mensagem manual via API */
export interface SendChatMessagePayload {
  readonly text: string
  readonly attachments?: readonly {
    readonly url: string
    readonly key: string
    readonly mimeType: string
    readonly fileName: string
    readonly fileSize?: number
  }[]
  readonly channel?: ChatChannel
}

/**
 * Resposta padrão da API de Envio. Campo `data` (não `message`) — casa com o
 * que a rota de fato sempre devolveu e `useChat.ts` sempre consumiu; a rota
 * nunca tinha tipo de retorno anotado antes desta extração (G1/G12), então
 * essa divergência nunca foi pega em tempo de compilação.
 */
export interface SendChatMessageResponse {
  readonly success: boolean
  readonly data: ChatMessage
}

/** Resposta da lista de conversas */
export interface ChatConversationsResponse {
  readonly data: readonly ChatConversation[]
  /** Total de conversas que batem com o filtro atual (não só o tamanho da página). */
  readonly total: number
  /** Existe mais alguma página além desta (G3/G4 de `_docs/CHAT/PRD.md`). */
  readonly hasMore: boolean
  readonly counts: {
    readonly all: number
    readonly attention: number
    readonly human: number
    readonly agent: number
  }
}

/** Resposta de mensagens paginadas */
export interface ChatMessagesResponse {
  readonly data: readonly ChatMessage[]
  readonly total: number
  readonly hasMore: boolean
}

/**
 * Cliente em transbordo agora (G13 §5, Camada 1 — bolinha pulsante + som,
 * escopo reduzido: sem e-mail/WhatsApp/Web Push).
 */
export interface ChatEscalation {
  readonly clienteId: string
  readonly clienteNome: string
  readonly pausadoAte: string
}

/** Snapshot inicial de `GET /api/admin/chat/escalations` — consumido no boot e a cada resync do socket único. */
export interface ChatEscalationsResponse {
  readonly data: readonly ChatEscalation[]
  readonly count: number
  /** `loja.chat_alerta_sonoro_ativo` — junto aqui porque `atendente`/`producao` não conseguem ler `loja` direto via RLS (só `gerente+`). */
  readonly chatAlertaSonoroAtivo: boolean
}
