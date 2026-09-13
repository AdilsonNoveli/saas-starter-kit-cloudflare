/**
 * Envelope do socket único e reutilizável da aplicação (`useRealtimeSocket.ts`
 * / `server/api/admin/chat/socket.ts`) — substitui o WebSocket do Supabase
 * Realtime por questão de custo (decisão registrada em `_docs/CHAT/PRD.md`).
 *
 * Uma DO só transmite para TODOS os conectados (staff de uma loja só —
 * modelo de instalação única deste projeto, `wrangler.toml`); o `topic`
 * dentro do envelope é quem decide, no CLIENTE, se algum handler se importa
 * com aquele evento — nunca o servidor filtrando por conexão.
 *
 * Validado via Zod nos dois lados: no servidor antes de transmitir
 * (`notifyRealtimeRoom`, um typo num payload novo não pode corromper o
 * parser de quem já está conectado) e no cliente antes de despachar
 * (`useRealtimeSocket.ts`, contra drift futuro do protocolo).
 */
import { z } from 'zod'

/**
 * Canal de pub/sub do crossws (`peer.subscribe`/`stub.publish`) — TODO
 * conectado assina este único canal; é diferente do `topic` do envelope
 * abaixo (que é só a chave de despacho lida pelo cliente já dentro do JSON).
 */
export const REALTIME_CHANNEL = 'realtime'

export const REALTIME_TOPICS = ['chat.message', 'chat.conversation_updated'] as const
export type RealtimeTopic = (typeof REALTIME_TOPICS)[number]

const chatMessageEventSchema = z.object({
  topic: z.literal('chat.message'),
  payload: z.object({
    id: z.string(),
    clienteId: z.string(),
    role: z.enum(['user', 'assistant']),
    content: z.string(),
    criadoEm: z.string(),
    seq: z.number().optional(),
    ator: z.string().nullable().optional(),
    status: z.string().optional(),
    wamid: z.string().nullable().optional(),
    channel: z.string().optional(),
    toolsUsed: z.array(z.string()).optional(),
  }),
})

const chatConversationUpdatedEventSchema = z.object({
  topic: z.literal('chat.conversation_updated'),
  payload: z.object({
    clienteId: z.string(),
    pausadoAte: z.string().nullable(),
    pausadoMotivo: z.string().nullable(),
  }),
})

export const realtimeEventSchema = z.discriminatedUnion('topic', [
  chatMessageEventSchema,
  chatConversationUpdatedEventSchema,
])

export type RealtimeEvent = z.infer<typeof realtimeEventSchema>
export type ChatMessageRealtimeEvent = z.infer<typeof chatMessageEventSchema>
export type ChatConversationUpdatedRealtimeEvent = z.infer<typeof chatConversationUpdatedEventSchema>
