import { serverSupabaseServiceRole } from '#supabase/server'
import { z } from 'zod'
import { logger } from '~/core/services/logger.service'
import { requireRole } from '../../../utils/auth/requireRole'
import { CUSTOMER_DELETE_ROLES } from '#shared/types/user'

const idSchema = z.string().uuid()

export default defineEventHandler(async (event) => {
  // Hard-delete em cascata (cliente + todo o histórico de pedidos) é
  // irreversível: restrito a gerência para cima. Antes, qualquer staff
  // (inclusive atendente/produção) podia destruir o histórico de um cliente.
  await requireRole(event, CUSTOMER_DELETE_ROLES)

  const idRaw = getRouterParam(event, 'id')
  if (!idSchema.safeParse(idRaw).success) {
    throw createError({ statusCode: 400, statusMessage: 'ID do cliente inválido' })
  }
  const id = idRaw as string

  // A Service Role tem poder de Hard Delete transacional
  const supabase = serverSupabaseServiceRole(event)

  try {
    // 1. Busca cliente para imagem
    const { data: cliente } = await supabase
      .from('clientes')
      .select('foto_url')
      .eq('id', id)
      .single()

    // 2. Limpeza S3 (Bucket: clientes, caso o app utilize avatar de clientes no bucket)
    if (cliente?.foto_url) {
      const match = cliente.foto_url.match(/clientes\/(.+)$/)
      if (match && match[1]) {
        await supabase.storage.from('clientes').remove([match[1]])
      }
    }

    // 3. Deleção em Cascata de Vínculos Estrangeiros
    // Pedidos (cascata no BD já exclui os itens_pedido automaticamente, pois `pedido_id` tem ON DELETE CASCADE)
    await supabase.from('pedidos').delete().eq('cliente_id', id)

    // Sessões e Rastreamento. (Sessões tem RESTRICT padrão, precisamos deletar antes do cliente)
    const { data: sessoes } = await supabase.from('sessoes').select('id').eq('cliente_id', id)
    if (sessoes && sessoes.length > 0) {
      const sessaoIds = sessoes.map(s => s.id)

      // Limpar rastreamentos atrelados às sessoes
      await supabase.from('evento_rastreamento').delete().in('sessao_id', sessaoIds)

      // Limpar cart_items atrelados às sessoes
      await supabase.from('cart_items').delete().in('sessao_id', sessaoIds)

      // Finalmente limpa as sessoes
      await supabase.from('sessoes').delete().eq('cliente_id', id)
    }

    // Histórico e telemetria do agente de WhatsApp. `cliente_id` em `whatsapp_conversas`,
    // `agente_avaliacao` e `agente_uso_tokens` também tem RESTRICT padrão — sem essa limpeza,
    // qualquer cliente que já trocou mensagem com o agente trava o delete com erro 500.
    await supabase.from('agente_avaliacao').delete().eq('cliente_id', id)
    await supabase.from('agente_uso_tokens').delete().eq('cliente_id', id)
    await supabase.from('whatsapp_conversas').delete().eq('cliente_id', id)

    // 4. Deleção Final do Cliente
    // Obs: A tabela `enderecos_cliente` já possui ON DELETE CASCADE na raiz.
    const { error } = await supabase.from('clientes').delete().eq('id', id)
    if (error) throw error

    return { success: true }
  } catch (err: unknown) {
    const e = err as { message?: string }
    logger.error('[customers/delete] Erro na deleção em cascata', { id, error: e.message })
    throw createError({ statusCode: 500, statusMessage: 'Erro interno ao deletar cliente' })
  }
})
