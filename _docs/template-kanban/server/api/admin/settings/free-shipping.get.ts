/**
 * Endpoint GET /api/admin/settings/free-shipping
 *
 * Config atual da campanha de frete grátis para
 * `app/components/admin/FreeShippingConfig.vue`. Antes lida direto do
 * navegador via `useSupabaseClient()` — migrado pro guard padrão das
 * rotas admin (§5 do AUDITORIA.md).
 */
import { createError } from 'h3'
import { logger } from '~/core/services/logger.service'
import { requireServiceRole } from '../../../utils/auth/requireRole'
import { STAFF_ROLES } from '#shared/types/user'
import type { PromotionConfig } from '#shared/types/store'

export interface FreeShippingSettings {
  habilitar_upsell_frete: boolean
  meta_frete_gratis: number
  habilitar_toast_upsell: boolean
  copy_upsell_success: string
  copy_upsell_progress: string
}

const DEFAULTS: FreeShippingSettings = {
  habilitar_upsell_frete: true,
  meta_frete_gratis: 80,
  habilitar_toast_upsell: true,
  copy_upsell_success: 'Parabéns! Você desbloqueou o FRETE GRÁTIS!',
  copy_upsell_progress: 'Faltam só {valor} para você ganhar FRETE GRÁTIS!',
}

export default defineEventHandler(async (event): Promise<{ lojaId: string | null; settings: FreeShippingSettings }> => {
  const { supabase } = await requireServiceRole(event, STAFF_ROLES)

  const { data, error } = await supabase
    .from('store')
    .select('id, promotions_config')
    .limit(1)
    .maybeSingle()

  if (error && error.code !== 'PGRST116') {
    logger.error('[admin/settings/free-shipping] Falha ao carregar config', { error: error.message })
    throw createError({ statusCode: 500, statusMessage: 'Falha ao carregar configuração de frete grátis' })
  }

  if (!data) {
    return { lojaId: null, settings: DEFAULTS }
  }

  const cfg = (data.promotions_config as Partial<PromotionConfig> | null) ?? {}
  return {
    lojaId: data.id,
    settings: {
      habilitar_upsell_frete: cfg.habilitar_upsell_frete ?? DEFAULTS.habilitar_upsell_frete,
      meta_frete_gratis: cfg.meta_frete_gratis ?? DEFAULTS.meta_frete_gratis,
      habilitar_toast_upsell: cfg.habilitar_toast_upsell ?? DEFAULTS.habilitar_toast_upsell,
      copy_upsell_success: cfg.copy_upsell_success ?? DEFAULTS.copy_upsell_success,
      copy_upsell_progress: cfg.copy_upsell_progress ?? DEFAULTS.copy_upsell_progress,
    },
  }
})
