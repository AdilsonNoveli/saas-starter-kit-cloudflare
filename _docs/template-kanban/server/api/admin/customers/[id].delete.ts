import { z } from 'zod'
import { logger } from '~/core/services/logger.service'
import { requireServiceRole } from '../../../utils/auth/requireRole'
import { CUSTOMER_DELETE_ROLES } from '#shared/types/user'
import { notifyRealtimeRoom } from '../../../utils/chat/chatRoom'
import { cloudflareEnv } from '../../../utils/whatsapp/queueBindings'

const idSchema = z.string().uuid()

export default defineEventHandler(async (event) => {
  // Hard-delete em cascata (cliente + todo o histórico de pedidos) é
  // irreversível: restrito a gerência para cima. Antes, qualquer staff
  // (inclusive atendente/produção) podia destruir o histórico de um cliente.
  // A Service Role tem poder de Hard Delete transacional
  const { supabase } = await requireServiceRole(event, CUSTOMER_DELETE_ROLES)

  const idRaw = getRouterParam(event, 'id')
  if (!idSchema.safeParse(idRaw).success) {
    throw createError({ statusCode: 400, statusMessage: 'ID do cliente inválido' })
  }
  const id = idRaw as string

  try {
    // 1. Busca cliente para imagem
    const { data: cliente } = await supabase
      .from('customers')
      .select('photo_url')
      .eq('id', id)
      .single()

    // 2. Limpeza S3 (Bucket: clientes, caso o app utilize avatar de clientes no bucket)
    if (cliente?.photo_url) {
      const match = cliente.photo_url.match(/clientes\/(.+)$/)
      if (match && match[1]) {
        await supabase.storage.from('clientes').remove([match[1]])
      }
    }

    // 3. Deleção em Cascata de Vínculos Estrangeiros
    // Pedidos (cascata no BD já exclui os order_items automaticamente, pois `order_id` tem ON DELETE CASCADE)
    await supabase.from('orders').delete().eq('customer_id', id)

    // Sessões e Rastreamento. (Sessões tem RESTRICT padrão, precisamos deletar antes do cliente)
    const { data: sessoes } = await supabase.from('sessions').select('id').eq('customer_id', id)
    if (sessoes && sessoes.length > 0) {
      const sessaoIds = sessoes.map(s => s.id)

      // Limpar rastreamentos atrelados às sessoes
      await supabase.from('tracking_events').delete().in('session_id', sessaoIds)

      // Limpar cart_items atrelados às sessoes
      await supabase.from('cart_items').delete().in('session_id', sessaoIds)

      // Finalmente limpa as sessoes
      await supabase.from('sessions').delete().eq('customer_id', id)
    }

    // Histórico e telemetria do agente de WhatsApp. `customer_id` em `whatsapp_conversations`,
    // `agent_evaluation` e `agent_token_usage` também tem RESTRICT padrão — sem essa limpeza,
    // qualquer cliente que já trocou mensagem com o agente trava o delete com erro 500.
    await supabase.from('agent_evaluation').delete().eq('customer_id', id)
    await supabase.from('agent_token_usage').delete().eq('customer_id', id)
    await supabase.from('whatsapp_conversations').delete().eq('customer_id', id)

    // 4. Deleção Final do Cliente
    // Obs: A tabela `customer_addresses` já possui ON DELETE CASCADE na raiz.
    const { error } = await supabase.from('customers').delete().eq('id', id)
    if (error) throw error

    // Cliente deletado pode estar em transbordo/pausado no momento — sem
    // isso, quem já tinha o socket único aberto (inbox, bolinha do menu de
    // G13) nunca recebe sinal de que esse cliente sumiu, e a bolinha/card
    // ficam presos indefinidamente com um id que não existe mais. Mesmo
    // payload de "resume": pausadoAte/pausadoMotivo nulos.
    await notifyRealtimeRoom(cloudflareEnv(event), {
      topic: 'chat.conversation_updated',
      payload: { clienteId: id, pausadoAte: null, pausadoMotivo: null },
    })

    return { success: true }
  } catch (err: unknown) {
    const e = err as { message?: string }
    logger.error('[customers/delete] Erro na deleção em cascata', { id, error: e.message })
    throw createError({ statusCode: 500, statusMessage: 'Erro interno ao deletar cliente' })
  }
})
