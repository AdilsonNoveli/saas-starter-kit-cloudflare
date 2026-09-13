/**
 * Endpoint PUT /api/admin/settings/free-shipping
 *
 * Salva a config da campanha de frete grátis para
 * `app/components/admin/FreeShippingConfig.vue`. Antes gravada direto do
 * navegador via `useSupabaseClient()` — migrado pro guard padrão das
 * rotas admin (§5 do AUDITORIA.md).
 *
 * READ-MODIFY-WRITE: `promotions_config` é um JSON único compartilhado com
 * Aparência (`mostrar_miniaturas_card`) — relê o valor atual antes de
 * mesclar só os 4 campos de frete, pra não sobrescrever o que este
 * endpoint não gerencia. Mesma semântica do componente original, agora no
 * servidor em vez de dois round-trips do navegador.
 */
import { z } from 'zod'
import { createError, readBody } from 'h3'
import { logger } from '~/core/services/logger.service'
import { requireServiceRole } from '../../../utils/auth/requireRole'
import { STAFF_ROLES } from '#shared/types/user'

const bodySchema = z.object({
  lojaId: z.string().uuid(),
  habilitar_upsell_frete: z.boolean(),
  meta_frete_gratis: z.number().min(0),
  habilitar_toast_upsell: z.boolean(),
  copy_upsell_success: z.string(),
  copy_upsell_progress: z.string(),
})

export default defineEventHandler(async (event): Promise<{ success: true }> => {
  const { supabase } = await requireServiceRole(event, STAFF_ROLES)

  const parsed = bodySchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Dados inválidos', data: parsed.error.issues })
  }
  const { lojaId, ...fields } = parsed.data

  const { data: fresh, error: readErr } = await supabase
    .from('store')
    .select('promotions_config')
    .eq('id', lojaId)
    .maybeSingle()

  if (readErr) {
    logger.error('[admin/settings/free-shipping] Falha ao reler config antes de salvar', { error: readErr.message })
    throw createError({ statusCode: 500, statusMessage: 'Falha ao salvar configuração de frete grátis' })
  }

  const current = (fresh?.promotions_config as Record<string, unknown> | null) ?? {}
  const merged = { ...current, ...fields }

  const { error: writeErr } = await supabase
    .from('store')
    .update({ promotions_config: merged })
    .eq('id', lojaId)

  if (writeErr) {
    logger.error('[admin/settings/free-shipping] Falha ao gravar config', { error: writeErr.message })
    throw createError({ statusCode: 500, statusMessage: 'Falha ao salvar configuração de frete grátis' })
  }

  return { success: true }
})
