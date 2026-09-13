/**
 * Nitro Scheduled Task: orders:archive
 *
 * Arquiva pedidos elegíveis diretamente, sem HTTP roundtrip.
 * Acionada pelo Cloudflare Cron Trigger (every hour), preset cloudflare-durable.
 *
 * Docs: https://nitro.build/guide/tasks
 *       https://developers.cloudflare.com/workers/configuration/cron-triggers/
 */

import { archiveEligibleOrders } from '../../utils/orders/archiveOrders'
import { logger } from '~/core/services/logger.service'
import { buildSupabaseServiceClient, hasSupabaseServiceCredentials } from '../../utils/supabase/serviceClient'

export default defineTask({
  meta: {
    name: 'orders:archive',
    description: 'Arquiva pedidos elegíveis conforme regras de loja.config_pedidos.',
  },
  async run() {
    if (!hasSupabaseServiceCredentials()) {
      logger.warn('orders:archive task: NUXT_PUBLIC_SUPABASE_URL ou NUXT_SUPABASE_SECRET_KEY ausentes, pulando.')
      return { result: 'skipped' }
    }

    const supabase = buildSupabaseServiceClient()
    const result = await archiveEligibleOrders(supabase)
    logger.info('orders:archive task: ok', result)
    return { result: 'ok', ...result }
  },
})
