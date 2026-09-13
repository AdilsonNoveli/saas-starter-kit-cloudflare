/**
 * Endpoint GET /api/admin/coupons
 *
 * Lista de cupons para `app/components/admin/AdminCouponList.vue`. Antes
 * lida direto do navegador via `useSupabaseClient()` — migrado pro guard
 * padrão das rotas admin (§5 do AUDITORIA.md).
 */
import { createError } from 'h3'
import { logger } from '~/core/services/logger.service'
import { requireServiceRole } from '../../../utils/auth/requireRole'
import { STAFF_ROLES } from '#shared/types/user'

interface Cupom {
  id: string
  codigo: string
  descricao: string | null
  tipo_desconto: 'percentual' | 'fixo'
  valor: number
  uso_maximo: number | null
  uso_atual: number
  ativo: boolean
  data_inicio: string | null
  data_fim: string | null
}

export default defineEventHandler(async (event): Promise<{ data: Cupom[] }> => {
  const { supabase } = await requireServiceRole(event, STAFF_ROLES)

  const { data, error } = await supabase
    .from('coupons')
    .select('id, codigo:code, descricao:description, tipo_desconto:discount_type, valor:amount, uso_maximo:max_uses, uso_atual:current_uses, ativo:active, data_inicio:start_date, data_fim:end_date')
    .order('created_at', { ascending: false })

  if (error) {
    logger.error('[admin/coupons] Falha ao listar cupons', { error: error.message })
    throw createError({ statusCode: 500, statusMessage: 'Falha ao carregar cupons' })
  }

  return { data: (data ?? []) as Cupom[] }
})
