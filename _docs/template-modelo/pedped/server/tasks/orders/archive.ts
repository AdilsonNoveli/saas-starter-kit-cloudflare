/**
 * Nitro Scheduled Task: orders:archive
 *
 * Arquiva pedidos elegíveis diretamente, sem HTTP roundtrip.
 * Acionada pelo Cloudflare Cron Trigger (every hour) quando o preset é
 * cloudflare-module. Para Docker/Node, o pg_cron continua como fallback
 * chamando POST /api/cron/archive-orders.
 *
 * Docs: https://nitro.build/guide/tasks
 *       https://developers.cloudflare.com/workers/configuration/cron-triggers/
 */

import { createClient } from '@supabase/supabase-js'
import { archiveEligibleOrders } from '../../utils/orders/archiveOrders'
import { logger } from '~/core/services/logger.service'

export default defineTask({
  meta: {
    name: 'orders:archive',
    description: 'Arquiva pedidos elegíveis conforme regras de loja.config_pedidos.',
  },
  async run() {
    const config = useRuntimeConfig()
    const url = (config.public as Record<string, unknown> & { supabase?: { url?: string } }).supabase?.url ?? ''
    const serviceKey = process.env.NUXT_SUPABASE_SECRET_KEY ?? ''

    if (!url || !serviceKey) {
      logger.warn('orders:archive task: NUXT_PUBLIC_SUPABASE_URL ou NUXT_SUPABASE_SECRET_KEY ausentes, pulando.')
      return { result: 'skipped' }
    }

    const supabase = createClient(url, serviceKey, { auth: { persistSession: false } })
    const result = await archiveEligibleOrders(supabase)
    logger.info('orders:archive task: ok', result)
    return { result: 'ok', ...result }
  },
})
