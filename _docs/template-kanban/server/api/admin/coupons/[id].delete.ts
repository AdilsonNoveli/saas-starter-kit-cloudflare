/**
 * Endpoint DELETE /api/admin/coupons/:id
 *
 * Remoção de cupom para `app/components/admin/AdminCouponList.vue`. Antes
 * feita direto do navegador via `useSupabaseClient()` — migrado pro guard
 * padrão das rotas admin (§5 do AUDITORIA.md), mesmo teto de papel usado
 * por `products/[id].delete.ts`.
 */
import { z } from 'zod'
import { createError } from 'h3'
import { logger } from '~/core/services/logger.service'
import { requireServiceRole } from '../../../utils/auth/requireRole'
import { CUSTOMER_DELETE_ROLES } from '#shared/types/user'

const idSchema = z.string().uuid()

export default defineEventHandler(async (event): Promise<{ success: true }> => {
  // Impacto financeiro direto (descontos ativos): restrito a gerência para
  // cima, mesmo teto de `customers/[id].delete.ts`.
  const { supabase } = await requireServiceRole(event, CUSTOMER_DELETE_ROLES)

  const idRaw = getRouterParam(event, 'id')
  if (!idSchema.safeParse(idRaw).success) {
    throw createError({ statusCode: 400, statusMessage: 'ID do cupom inválido' })
  }
  const id = idRaw as string

  const { error } = await supabase.from('coupons').delete().eq('id', id)
  if (error) {
    logger.error('[admin/coupons/delete] Falha ao remover cupom', { id, error: error.message })
    throw createError({ statusCode: 500, statusMessage: 'Falha ao remover cupom' })
  }

  return { success: true }
})
