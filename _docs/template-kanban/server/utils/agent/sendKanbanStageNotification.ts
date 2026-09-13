/**
 * Envia a notificação de "Resposta Rápida" de etapa do Kanban (gatilho
 * `kanban_stage`) — chamado por `server/api/admin/orders/[id]/status.put.ts`
 * depois que o pedido já mudou de coluna.
 *
 * Envio DIRETO (síncrono), não pela fila `CHAT_OUTBOUND_QUEUE`: aquela fila
 * (`server/plugins/whatsapp-chat-outbound-queue.ts`) e a função que a
 * alimenta (`chatService.dispatchOutboundMessage`) são desenhadas pra envio
 * MANUAL do painel — gravam `ator: 'humano_painel'` fixo (aqui é
 * `'sistema'`) e chamam `pauseCustomer(..., 'manual')` no final (aqui NUNCA:
 * uma notificação automática de status não pode fazer o agente parar de
 * responder o cliente). Reaproveitar exigiria mexer num consumer
 * compartilhado e já testado por uma ação pouco frequente — não vale.
 * `status.put.ts` é uma rota administrativa (staff arrastando um card), não
 * o webhook do Cloud API que precisa responder em milissegundos — pagar
 * ~300-500ms a mais na resposta HTTP é aceitável.
 *
 * Best-effort de ponta a ponta: nenhuma falha aqui pode derrubar a resposta
 * de `status.put.ts` — o pedido já mudou de coluna, que é o que importa pro
 * staff.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '~/types/database.types'
import { logger } from '~/core/services/logger.service'
import { resolveKanbanStageQuickResponse } from './kanbanStageQuickResponse'
import { sendText, type CloudApiClientConfig } from '../whatsapp/cloudApiClient'
import { notifyRealtimeRoom } from '../chat/chatRoom'
import type { CustomerStatus } from '#shared/types/agentQuickResponse'

export interface SendKanbanStageNotificationInput {
  readonly clienteId: string
  readonly telefone: string | null
  readonly lid: string | null
  readonly kanbanStageKey: string
  readonly customerStatus: CustomerStatus | null
}

const MESSAGE_SELECT = 'id, customer_id, role, content, created_at, seq, actor, status, wamid, channel'

export async function sendKanbanStageNotification(
  supabase: SupabaseClient<Database>,
  provider: CloudApiClientConfig,
  env: Record<string, unknown> | undefined,
  input: SendKanbanStageNotificationInput,
): Promise<void> {
  try {
    const rule = await resolveKanbanStageQuickResponse(supabase, {
      kanbanStageKey: input.kanbanStageKey,
      customerStatus: input.customerStatus,
    })
    if (!rule) return

    if (!input.telefone) {
      logger.warn('[agent] resposta rápida de etapa do kanban sem telefone — não enviada', {
        clienteId: input.clienteId,
        ruleId: rule.id,
      })
      return
    }

    const { data: inserted, error: insertErr } = await supabase
      .from('whatsapp_conversations')
      .insert({
        customer_id: input.clienteId,
        role: 'assistant',
        content: rule.replyText,
        actor: 'sistema',
        status: 'pending',
      })
      .select(MESSAGE_SELECT)
      .single()

    if (insertErr || !inserted) {
      logger.error('[agent] falha ao gravar notificação de etapa do kanban', {
        clienteId: input.clienteId,
        error: insertErr?.message,
      })
      return
    }

    let wamid: string | null = null
    let status: 'sent' | 'failed' = 'sent'
    try {
      wamid = await sendText(provider, { telefone: input.telefone, lid: input.lid }, rule.replyText)
    } catch (err) {
      status = 'failed'
      logger.error('[agent] falha ao enviar notificação de etapa do kanban', {
        clienteId: input.clienteId,
        error: err instanceof Error ? err.message : String(err),
      })
    }

    await supabase.from('whatsapp_conversations').update({ status, wamid }).eq('id', inserted.id)

    await notifyRealtimeRoom(env, {
      topic: 'chat.message',
      payload: {
        id: inserted.id,
        clienteId: input.clienteId,
        role: 'assistant',
        content: rule.replyText,
        criadoEm: inserted.created_at,
        seq: inserted.seq,
        ator: 'sistema',
        status,
        wamid: wamid ?? undefined,
        channel: inserted.channel ?? undefined,
      },
    })

    // Fire-and-forget, mesmo padrão dos outros 3 gatilhos (whatsapp-queue.ts)
    // — telemetria de uso, nunca no caminho crítico.
    supabase.rpc('increment_agent_quick_response_usage', { p_rule_id: rule.id }).then(
      ({ error }) => {
        if (error) {
          logger.error('[agent] falha ao incrementar contador de resposta rápida (ignorado)', {
            ruleId: rule.id,
            error: error.message,
          })
        }
      },
    )
  } catch (err) {
    logger.error('[agent] falha inesperada ao processar notificação de etapa do kanban', {
      clienteId: input.clienteId,
      kanbanStageKey: input.kanbanStageKey,
      error: err instanceof Error ? err.message : String(err),
    })
  }
}
