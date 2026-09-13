/**
 * Camada de serviço do Sistema de Chat (G1 de `_docs/CHAT/PRD.md`) — o
 * arquivo que o PRD original (§2.2) prometeu e nunca foi criado. Antes desta
 * extração, `listConversations`/`getConversationMessages`/
 * `dispatchOutboundMessage`/`toggleTakeoverStatus`/`getCustomerChatContext`
 * estavam implementadas *inline*, duplicadas, dentro de cada
 * `server/api/admin/chat/**\/*.ts` — as rotas agora só validam entrada
 * (`requireRole`, parse de body/params) e delegam para cá.
 *
 * `listConversations`/`getConversationMessages` já nascem com a correção de
 * consulta do §6.1/§6.4 do PRD (G2, G3, G4): leem `customer_conversation_summary`
 * (nunca escaneiam `whatsapp_conversations` inteira) e paginam de verdade — não
 * fazia sentido extrair a versão antiga só para reescrevê-la de novo na fase
 * seguinte.
 *
 * `dispatchOutboundMessage` grava a mensagem e enfileira o envio real na fila
 * `chat-outbound` (G5/G6) — nunca chama a Cloud API síncrono dentro da rota;
 * quem envia de fato é `server/plugins/whatsapp-chat-outbound-queue.ts`.
 */
import { createError } from 'h3'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '~/types/database.types'
import { logger } from '~/core/services/logger.service'
import { parseChatMessageContent, parseChatMessage, type ChatMessageRow } from '#shared/utils/chatMessage'
import { deriveChatPauseStatus } from '#shared/utils/chatPauseStatus'
import { HUMAN_REPLY_PREFIX } from '#shared/constants/whatsapp'
import type {
  ChatConversation,
  ChatConversationsResponse,
  ChatCustomerAddress,
  ChatCustomerContext,
  ChatCustomerOrderSummary,
  ChatEscalation,
  ChatEscalationsResponse,
  ChatFilterTab,
  ChatMessage,
  ChatMessagesResponse,
  SendChatMessagePayload,
} from '#shared/types/chat'
import { pauseCustomer } from '../whatsapp/pauseState'
import { resolvePausaConfig } from '../whatsapp/resolvePausaConfig'
import { sendToQueue, queueBindingFrom, type WhatsappChatOutboundQueueMessage } from '../whatsapp/queueBindings'
import { notifyRealtimeRoom } from './chatRoom'
import { extractToolNames } from './toolTrace'

// ---------------------------------------------------------------------------
// listConversations (resolve G3, G4, G7 — lê customer_conversation_summary)
// ---------------------------------------------------------------------------

export interface ListConversationsFilters {
  readonly tab: ChatFilterTab
  readonly search: string
  readonly limit: number
  readonly offset: number
}

const DEFAULT_CONVERSATIONS_LIMIT = 50

/**
 * Teto de candidatos pré-selecionados por aba/busca — nunca a tabela inteira
 * (G3). Numa instalação de uma loja só (modelo deste projeto), algumas
 * centenas de clientes pausados/buscados por nome é uma folga generosa, não
 * um limite apertado; o ponto é ter UM teto explícito em vez de nenhum.
 */
const CANDIDATE_LOOKUP_LIMIT = 500

interface ConversationCandidate {
  readonly id: string
  readonly name: string | null
  readonly whatsapp_phone: string | null
  readonly photo_url: string | null
  readonly paused_until: string | null
  readonly pause_reason: string | null
  readonly has_pending_issues: boolean | null
}

interface ConversaResumoRow {
  customer_id: string
  last_message: string | null
  last_message_at: string | null
  last_message_role: string | null
  last_message_channel: string | null
  unread_count: number
}

const CANDIDATE_SELECT = 'id, name, whatsapp_phone, photo_url, paused_until, pause_reason, has_pending_issues'

/**
 * Ids de clientes elegíveis para a aba/busca atual, já com os dados que a
 * inbox precisa exibir. `null` = sem filtro nenhum (aba "all" sem busca) —
 * sinal para quem chamou usar a ordenação de `customer_conversation_summary` sem
 * pré-restringir por id.
 */
async function findCandidateClientes(
  supabase: SupabaseClient<Database>,
  filters: Pick<ListConversationsFilters, 'tab' | 'search'>,
): Promise<Map<string, ConversationCandidate> | null> {
  const search = filters.search.trim()
  if (filters.tab === 'all' && !search) return null

  let query = supabase.from('customers').select(CANDIDATE_SELECT)
  if (search) {
    const term = `%${search}%`
    query = query.or(`name.ilike.${term},whatsapp_phone.ilike.${term}`)
  }
  if (filters.tab === 'attention') {
    query = query.eq('pause_reason', 'transbordo')
  } else if (filters.tab === 'human') {
    query = query.in('pause_reason', ['manual', 'resposta_humana'])
  } else if (filters.tab === 'agent') {
    query = query.is('pause_reason', null)
  }

  const { data, error } = await query.limit(CANDIDATE_LOOKUP_LIMIT)
  if (error) {
    logger.error('[chat] falha ao pré-selecionar clientes para a inbox', { error: error.message })
    return new Map()
  }
  return new Map((data ?? []).map((c) => [c.id, c as ConversationCandidate]))
}

async function fetchClientesByIds(
  supabase: SupabaseClient<Database>,
  ids: readonly string[],
): Promise<Map<string, ConversationCandidate>> {
  if (ids.length === 0) return new Map()
  const { data, error } = await supabase.from('customers').select(CANDIDATE_SELECT).in('id', ids)
  if (error) {
    logger.error('[chat] falha ao buscar clientes da página da inbox', { error: error.message })
    return new Map()
  }
  return new Map((data ?? []).map((c) => [c.id, c as ConversationCandidate]))
}

function toChatConversation(row: ConversaResumoRow, cliente: ConversationCandidate): ChatConversation {
  const content = parseChatMessageContent(row.last_message ?? '')
  const pauseStatus = deriveChatPauseStatus({ pausadoAte: cliente.paused_until, pausadoMotivo: cliente.pause_reason })

  return {
    id: cliente.id,
    clienteId: cliente.id,
    clienteNome: cliente.name || 'Cliente sem nome',
    clienteTelefone: cliente.whatsapp_phone,
    clienteAvatar: cliente.photo_url,
    // NULL = resumo gravado antes da migration 123 (sem last_message_channel
    // ainda) — cai no canal original do produto, WhatsApp.
    channel: (row.last_message_channel as ChatConversation['channel']) ?? 'whatsapp',
    lastMessage: content.displayText || (cliente.whatsapp_phone ? 'Canal WhatsApp conectado' : 'Cliente registrado'),
    lastMessageAt: row.last_message_at ?? new Date().toISOString(),
    lastMessageRole: (row.last_message_role as 'user' | 'assistant' | null) ?? 'user',
    lastMessagePrefixType: content.prefixType,
    unreadCount: row.unread_count,
    pauseStatus,
    pausadoAte: cliente.paused_until,
    pausadoMotivo: cliente.pause_reason,
    possuiPendencias: Boolean(cliente.has_pending_issues),
  }
}

/**
 * Lista conversas ordenadas por ATIVIDADE de chat real (`last_message_at`
 * de `customer_conversation_summary`), nunca por `last_order_at` (G4) e nunca
 * escaneando `whatsapp_conversations` inteira para achar a última mensagem de
 * cada cliente em JavaScript (G3 — a tabela de resumo, mantida por trigger,
 * já entrega isso pronto e indexado).
 *
 * Duas consultas, não uma com JOIN embutido: filtro de aba/busca mora em
 * `customers` (`pause_reason`, `name`, `whatsapp_phone`), a ordenação
 * mora em `customer_conversation_summary` — mesmo idioma de duas consultas +
 * `Map` já usado em `getCustomerChatContext` (`order_items` por `order_id`).
 */
export async function listConversations(
  supabase: SupabaseClient<Database>,
  filters: ListConversationsFilters,
): Promise<ChatConversationsResponse> {
  const limit = filters.limit > 0 ? filters.limit : DEFAULT_CONVERSATIONS_LIMIT
  const offset = Math.max(filters.offset, 0)

  const candidates = await findCandidateClientes(supabase, filters)
  if (candidates && candidates.size === 0) {
    const counts = await countConversationsByTab(supabase, filters.search)
    return { data: [], total: 0, hasMore: false, counts }
  }

  let resumoQuery = supabase
    .from('customer_conversation_summary')
    .select('customer_id, last_message, last_message_at, last_message_role, last_message_channel, unread_count', { count: 'exact' })

  if (candidates) {
    resumoQuery = resumoQuery.in('customer_id', [...candidates.keys()])
  }

  const { data, error, count } = await resumoQuery
    .order('last_message_at', { ascending: false, nullsFirst: false })
    .range(offset, offset + limit - 1)

  if (error) {
    logger.error('[chat] falha ao listar conversas', { error: error.message })
    throw createError({ statusCode: 500, statusMessage: 'Erro ao buscar conversas.' })
  }

  const rows = (data ?? []) as ConversaResumoRow[]
  const clienteMap = candidates ?? await fetchClientesByIds(supabase, rows.map((r) => r.customer_id))

  const list: ChatConversation[] = rows
    .map((row) => {
      const cliente = clienteMap.get(row.customer_id)
      return cliente ? toChatConversation(row, cliente) : null
    })
    .filter((c): c is ChatConversation => c !== null)

  const total = count ?? list.length
  const counts = await countConversationsByTab(supabase, filters.search)

  return {
    data: list,
    total,
    hasMore: offset + list.length < total,
    counts,
  }
}

/**
 * 4 contagens indexadas — cada uma reaproveita `findCandidateClientes` (já
 * bounded, `CANDIDATE_LOOKUP_LIMIT`) e conta linhas de resumo dentro desse
 * conjunto, nunca uma agregação em JS sobre a página carregada.
 */
async function countConversationsByTab(
  supabase: SupabaseClient<Database>,
  search: string,
): Promise<ChatConversationsResponse['counts']> {
  const countFor = async (tab: ChatFilterTab): Promise<number> => {
    const candidates = await findCandidateClientes(supabase, { tab, search })

    let query = supabase
      .from('customer_conversation_summary')
      .select('customer_id', { count: 'exact', head: true })
    if (candidates) {
      if (candidates.size === 0) return 0
      query = query.in('customer_id', [...candidates.keys()])
    }

    const { count, error } = await query
    if (error) {
      logger.error('[chat] falha ao contar conversas', { tab, error: error.message })
      return 0
    }
    return count ?? 0
  }

  const [all, attention, human, agent] = await Promise.all([
    countFor('all'),
    countFor('attention'),
    countFor('human'),
    countFor('agent'),
  ])

  return { all, attention, human, agent }
}

// ---------------------------------------------------------------------------
// getConversationMessages (resolve G2, §6.4 — cursor real, mais recentes primeiro)
// ---------------------------------------------------------------------------

export interface GetConversationMessagesOptions {
  readonly limit: number
  /** `seq` da mensagem mais antiga já carregada — busca estritamente antes dela. */
  readonly beforeSeq?: number | null
}

const DEFAULT_MESSAGES_LIMIT = 50

interface WhatsappConversaRow {
  id: string
  customer_id: string
  role: string
  content: string
  created_at: string
  seq: number
  actor: string | null
  status: string | null
  wamid: string | null
  channel: string | null
}

function toChatMessage(raw: WhatsappConversaRow, toolsUsed?: readonly string[]): ChatMessage {
  const role = raw.role as 'user' | 'assistant'
  const parsed = parseChatMessage({ role, content: raw.content, actor: raw.actor as ChatMessageRow['actor'] })

  return {
    id: raw.id,
    conversationId: raw.customer_id,
    clienteId: raw.customer_id,
    role,
    content: raw.content,
    displayText: parsed.displayText,
    prefixType: parsed.prefixType,
    criadoEm: raw.created_at,
    seq: raw.seq,
    isFromStaff: parsed.isFromStaff,
    isFromAgent: parsed.isFromAgent,
    status: (raw.status as ChatMessage['status']) ?? 'sent',
    actor: (raw.actor ?? undefined) as ChatMessage['actor'],
    channel: (raw.channel ?? 'whatsapp') as ChatMessage['channel'],
    wamid: raw.wamid,
    toolsUsed: toolsUsed && toolsUsed.length > 0 ? toolsUsed : undefined,
  }
}

/**
 * Tools chamadas pelo agente por `seq` de mensagem, só para as linhas do
 * AGENTE na página atual (`agent_token_usage.tool_trace`, migration 106) —
 * nunca uma consulta por mensagem: um único `IN (...)` cobre a página
 * inteira (mesmo espírito de bounded/indexado de G3).
 */
async function loadToolNamesBySeq(
  supabase: SupabaseClient<Database>,
  clienteId: string,
  assistantSeqs: readonly number[],
): Promise<Map<number, readonly string[]>> {
  if (assistantSeqs.length === 0) return new Map()

  const { data, error } = await supabase
    .from('agent_token_usage')
    .select('seq, tool_trace')
    .eq('customer_id', clienteId)
    .in('seq', assistantSeqs)

  if (error) {
    logger.error('[chat] falha ao buscar tool_trace das mensagens do agente', { clienteId, error: error.message })
    return new Map()
  }

  const map = new Map<number, readonly string[]>()
  for (const row of data ?? []) {
    if (row.seq == null) continue
    const names = extractToolNames(row.tool_trace)
    if (names.length > 0) map.set(row.seq, names)
  }
  return map
}

/**
 * Busca as N mensagens mais RECENTES (nunca as mais antigas — G2), devolve em
 * ordem cronológica para a UI, com cursor real (`beforeSeq`) para carregar
 * histórico mais antigo ao rolar para cima.
 */
export async function getConversationMessages(
  supabase: SupabaseClient<Database>,
  clienteId: string,
  options: GetConversationMessagesOptions,
): Promise<ChatMessagesResponse> {
  const limit = options.limit > 0 ? options.limit : DEFAULT_MESSAGES_LIMIT

  let query = supabase
    .from('whatsapp_conversations')
    .select('id, customer_id, role, content, created_at, seq, actor, status, wamid, channel')
    .eq('customer_id', clienteId)

  if (options.beforeSeq != null) {
    query = query.lt('seq', options.beforeSeq)
  }

  const { data, error } = await query
    .order('created_at', { ascending: false })
    .order('seq', { ascending: false })
    .limit(limit)

  if (error) {
    logger.error('[chat] falha ao buscar mensagens', { clienteId, error: error.message })
    throw createError({ statusCode: 500, statusMessage: 'Erro ao buscar mensagens.' })
  }

  const rows = (data ?? []) as WhatsappConversaRow[]
  // Página veio cheia (== limit) ⇒ provavelmente há mais mensagens antigas.
  // Se vier vazia/parcial, chegamos ao início real da conversa.
  const hasMore = rows.length === limit

  const assistantSeqs = rows.filter((row) => row.role === 'assistant').map((row) => row.seq)
  const toolNamesBySeq = await loadToolNamesBySeq(supabase, clienteId, assistantSeqs)

  const messages = rows
    .slice()
    .reverse()
    .map((row) => toChatMessage(row, toolNamesBySeq.get(row.seq)))

  return {
    data: messages,
    total: messages.length,
    hasMore,
  }
}

// ---------------------------------------------------------------------------
// dispatchOutboundMessage — envio manual do painel via fila (G5, G6)
// ---------------------------------------------------------------------------

export interface DispatchOutboundMessageDeps {
  readonly supabase: SupabaseClient<Database>
  /** Binding Cloudflare (`cloudflareEnv(event)`) — transmite no socket único e enfileira o envio real; `undefined` fora do runtime Cloudflare (dev local, testes) só deixa de fazer as duas coisas. */
  readonly env?: Record<string, unknown>
}

/**
 * Grava a mensagem manual do painel e enfileira o envio real — nunca chama a
 * Cloud API aqui dentro (G5). A linha nasce `pending` quando o cliente tem
 * canal (`whatsapp_phone`); sem canal não há o que entregar, nasce `sent`
 * direto (só fica no histórico). Só o consumer da fila `chat-outbound`
 * (`server/plugins/whatsapp-chat-outbound-queue.ts`), depois de uma resposta
 * REAL da Cloud API, grava `sent`/`failed` — e é lá que o `wamid` é
 * capturado para o dedupe do echo (G6).
 */
export async function dispatchOutboundMessage(
  deps: DispatchOutboundMessageDeps,
  clienteId: string,
  payload: SendChatMessagePayload,
): Promise<ChatMessage> {
  const { supabase, env } = deps
  const text = (payload.text ?? '').trim()
  const attachments = payload.attachments ?? []

  if (!text && attachments.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'Mensagem ou anexo é obrigatório.' })
  }

  const { data: cliente, error: errCliente } = await supabase
    .from('customers')
    .select('id, name, whatsapp_phone, whatsapp_lid')
    .eq('id', clienteId)
    .maybeSingle()

  if (errCliente || !cliente) {
    throw createError({ statusCode: 404, statusMessage: 'Cliente não encontrado.' })
  }

  const temCanal = Boolean(cliente.whatsapp_phone)
  const finalContent = `${HUMAN_REPLY_PREFIX} ${text}`

  const { data: novaMensagem, error: errInsert } = await supabase
    .from('whatsapp_conversations')
    .insert({
      customer_id: clienteId,
      role: 'assistant',
      content: finalContent,
      actor: 'humano_painel',
      status: temCanal ? 'pending' : 'sent',
    })
    .select('id, customer_id, role, content, created_at, seq, actor, status, wamid, channel')
    .single()

  if (errInsert || !novaMensagem) {
    throw createError({ statusCode: 500, statusMessage: 'Erro ao salvar mensagem no histórico.' })
  }

  await notifyRealtimeRoom(env, {
    topic: 'chat.message',
    payload: {
      id: novaMensagem.id,
      clienteId: novaMensagem.customer_id,
      role: novaMensagem.role as 'user' | 'assistant',
      content: novaMensagem.content,
      criadoEm: novaMensagem.created_at,
      seq: novaMensagem.seq,
      ator: 'humano_painel',
      status: novaMensagem.status ?? undefined,
      channel: novaMensagem.channel ?? undefined,
    },
  })

  if (temCanal) {
    await sendToQueue<WhatsappChatOutboundQueueMessage>(
      queueBindingFrom<WhatsappChatOutboundQueueMessage>(env, 'CHAT_OUTBOUND_QUEUE'),
      'CHAT_OUTBOUND_QUEUE',
      {
        mensagemId: novaMensagem.id,
        clienteId,
        telefone: cliente.whatsapp_phone as string,
        lid: cliente.whatsapp_lid,
        text,
        attachmentUrls: attachments.map((att) => att.url).filter(Boolean),
      },
    )
  }

  const { minutos } = await resolvePausaConfig(supabase)
  await pauseCustomer(supabase, clienteId, minutos, 'manual')
  await notifyRealtimeRoom(env, {
    topic: 'chat.conversation_updated',
    payload: {
      clienteId,
      pausadoAte: new Date(Date.now() + minutos * 60_000).toISOString(),
      pausadoMotivo: 'manual',
    },
  })

  const parsed = toChatMessage(novaMensagem as WhatsappConversaRow)
  return {
    ...parsed,
    displayText: text,
    attachments: attachments.map((att, idx) => ({
      id: `${novaMensagem.id}-att-${idx}`,
      url: att.url,
      key: att.key,
      fileName: att.fileName,
      mimeType: att.mimeType,
      fileSize: att.fileSize,
    })),
    staffName: 'Atendente (Loja)',
  }
}

// ---------------------------------------------------------------------------
// toggleTakeoverStatus — assumir / devolver ao agente
// ---------------------------------------------------------------------------

export interface ToggleTakeoverResult {
  readonly success: true
  readonly action: 'pause' | 'resume'
  readonly clienteId: string
}

export async function toggleTakeoverStatus(
  supabase: SupabaseClient<Database>,
  clienteId: string,
  action: 'pause' | 'resume',
  minutes?: number,
  env?: Record<string, unknown>,
): Promise<ToggleTakeoverResult> {
  if (action === 'pause') {
    const config = await resolvePausaConfig(supabase)
    const duracao = minutes || config.minutos
    await pauseCustomer(supabase, clienteId, duracao, 'manual')
    await notifyRealtimeRoom(env, {
      topic: 'chat.conversation_updated',
      payload: {
        clienteId,
        pausadoAte: new Date(Date.now() + duracao * 60_000).toISOString(),
        pausadoMotivo: 'manual',
      },
    })
    return { success: true, action: 'pause', clienteId }
  }

  const { error } = await supabase
    .from('customers')
    .update({ paused_until: null, pause_reason: null })
    .eq('id', clienteId)

  if (error) {
    throw createError({ statusCode: 500, statusMessage: 'Erro ao reativar o Agente IA.' })
  }

  await notifyRealtimeRoom(env, {
    topic: 'chat.conversation_updated',
    payload: { clienteId, pausadoAte: null, pausadoMotivo: null },
  })

  return { success: true, action: 'resume', clienteId }
}

// ---------------------------------------------------------------------------
// listEscalations (resolve G13 §5, Camada 1 — bolinha pulsante + som,
// escopo reduzido: sem cron, sem e-mail/WhatsApp ao lojista)
// ---------------------------------------------------------------------------

/**
 * Snapshot dos clientes em transbordo agora (`pause_reason = 'transbordo'`
 * e prazo ainda não expirado) + o toggle `store.chat_sound_alert_active`
 * lido via service role, na mesma consulta — a RLS de `store` (migration 004,
 * `gerente+`) bloquearia `atendente`/`producao` lendo isso direto do client,
 * e o alerta sonoro precisa funcionar para qualquer staff logado no painel,
 * não só gerente+. Usado no boot de `useChatEscalations.ts` e a cada resync
 * do socket único; a atualização em tempo real vem do tópico
 * `chat.conversation_updated`, já emitido por `pauseGate.ts`/`agent.ts` no
 * momento real do transbordo.
 */
export async function listEscalations(
  supabase: SupabaseClient<Database>,
): Promise<ChatEscalationsResponse> {
  const nowIso = new Date().toISOString()

  const [{ data: clientesData, error: errClientes }, { data: lojaData }] = await Promise.all([
    supabase
      .from('customers')
      .select('id, name, paused_until')
      .eq('pause_reason', 'transbordo')
      .gt('paused_until', nowIso)
      .limit(CANDIDATE_LOOKUP_LIMIT),
    supabase.from('store').select('chat_sound_alert_active').limit(1).maybeSingle(),
  ])

  if (errClientes) {
    logger.error('[chat] falha ao listar escalações de transbordo', { error: errClientes.message })
    throw createError({ statusCode: 500, statusMessage: 'Erro ao buscar escalações.' })
  }

  const data: ChatEscalation[] = (clientesData ?? []).map((c) => ({
    clienteId: c.id,
    clienteNome: c.name || 'Cliente sem nome',
    pausadoAte: c.paused_until as string,
  }))

  return {
    data,
    count: data.length,
    chatAlertaSonoroAtivo: lojaData?.chat_sound_alert_active ?? true,
  }
}

// ---------------------------------------------------------------------------
// getCustomerChatContext (resolve G9 — lê frozen_unit_price, nunca recalcula)
// ---------------------------------------------------------------------------

export async function getCustomerChatContext(
  supabase: SupabaseClient<Database>,
  clienteId: string,
): Promise<ChatCustomerContext> {
  const [{ data: cliente, error: errCliente }, { data: enderecos }, { data: colunasKanban }] = await Promise.all([
    supabase
      .from('customers')
      .select('id, name, whatsapp_phone, whatsapp_lid, is_guest, customer_since, internal_notes, total_orders, total_amount_spent, purchase_frequency, last_order_at')
      .eq('id', clienteId)
      .maybeSingle(),
    supabase
      .from('customer_addresses')
      .select('id, street, number, complement, neighborhood, city, state, zip_code, is_default')
      .eq('customer_id', clienteId)
      .order('is_default', { ascending: false }),
    supabase
      .from('kanban_column')
      .select('key, label, color'),
  ])

  if (errCliente || !cliente) {
    throw createError({ statusCode: 404, statusMessage: 'Cliente não encontrado.' })
  }

  const kanbanMap = new Map<string, { label: string, cor: string }>()
  for (const k of colunasKanban ?? []) {
    kanbanMap.set(k.key, { label: k.label, cor: k.color })
  }

  const { data: pedidos } = await supabase
    .from('orders')
    .select('id, short_id, created_at, status, total_amount, delivery_mode, payment_method')
    .eq('customer_id', clienteId)
    .order('created_at', { ascending: false })
    .limit(5)

  const pedidoIds = (pedidos ?? []).map((p) => p.id)

  const { data: itensRaw } = pedidoIds.length > 0
    ? await supabase
        .from('order_items')
        // `frozen_unit_price` é a fonte de verdade (congelado no
        // momento da compra) — recalcular via subtotal/quantity diverge
        // silenciosamente quando há desconto por item (G9).
        .select('id, order_id, product_id, quantity, subtotal, frozen_unit_price, frozen_product_name')
        .in('order_id', pedidoIds)
    : { data: [] }

  const pedidosSummary: ChatCustomerOrderSummary[] = (pedidos ?? []).map((p) => {
    const statusKey = p.status || 'aberto'
    const kInfo = kanbanMap.get(statusKey) || { label: statusKey, cor: '#22b573' }
    const itensDoPedido = (itensRaw ?? [])
      .filter((i) => i.order_id === p.id)
      .map((i) => ({
        id: i.id,
        produtoNome: i.frozen_product_name || 'Produto',
        quantidade: i.quantity,
        precoUnitario: Number(i.frozen_unit_price ?? 0),
        subtotal: Number(i.subtotal || 0),
      }))

    return {
      id: p.id,
      numeroSequencial: p.short_id ?? null,
      criadoEm: p.created_at || new Date().toISOString(),
      status: statusKey,
      statusLabel: kInfo.label,
      statusColor: kInfo.cor,
      valorTotal: Number(p.total_amount || 0),
      tipoEntrega: p.delivery_mode,
      formaPagamento: p.payment_method,
      itens: itensDoPedido,
    }
  })

  const enderecosFormatados: ChatCustomerAddress[] = (enderecos ?? []).map((e) => ({
    id: e.id,
    rua: e.street,
    numero: e.number,
    complemento: e.complement,
    bairro: e.neighborhood,
    cidade: e.city,
    estado: e.state,
    cep: e.zip_code,
    padrao: Boolean(e.is_default),
  }))

  return {
    id: cliente.id,
    nome: cliente.name || 'Cliente Anônimo',
    telefoneWhatsapp: cliente.whatsapp_phone,
    whatsappLid: cliente.whatsapp_lid,
    isVisitante: Boolean(cliente.is_guest),
    clienteDesde: cliente.customer_since,
    observacoesInternas: cliente.internal_notes,
    totalPedidos: cliente.total_orders || 0,
    valorGastoAcumulado: Number(cliente.total_amount_spent || 0),
    frequenciaCompra: cliente.purchase_frequency,
    ultimoPedidoEm: cliente.last_order_at,
    enderecos: enderecosFormatados,
    pedidosRecentes: pedidosSummary,
  }
}
