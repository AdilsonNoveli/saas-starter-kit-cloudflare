/**
 * Nitro Scheduled Task: webhook:drain
 *
 * Drena o webhook_outbox diretamente, sem HTTP roundtrip.
 * Acionada pelo Cloudflare Cron Trigger (every minute), preset cloudflare-durable.
 *
 * O `waitUntil` NÃO é necessário aqui: a task é a execução principal do
 * Worker (não background pós-resposta), então o runtime mantém o contexto
 * ativo até a promise resolver.
 *
 * Docs: https://nitro.build/guide/tasks
 *       https://developers.cloudflare.com/workers/configuration/cron-triggers/
 */

import { drainWebhookOutbox, pruneWebhookOutbox } from '../../utils/webhook/worker'
import { logger } from '~/core/services/logger.service'
import { buildSupabaseServiceClient, hasSupabaseServiceCredentials } from '../../utils/supabase/serviceClient'

export default defineTask({
  meta: {
    name: 'webhook:drain',
    description: 'Drena webhook_outbox: retry/backoff para entregas pendentes.',
  },
  async run() {
    if (!hasSupabaseServiceCredentials()) {
      logger.warn('webhook:drain task: NUXT_PUBLIC_SUPABASE_URL ou NUXT_SUPABASE_SECRET_KEY ausentes, pulando.')
      return { result: 'skipped' }
    }

    const supabase = buildSupabaseServiceClient()
    const result = await drainWebhookOutbox(supabase)
    // Poda depois de drenar: retenção é manutenção de tabela, não pode atrasar
    // nem derrubar a entrega. Roda no mesmo minuto porque o `DELETE` filtra por
    // status e data — na esmagadora maioria das execuções não casa nada.
    const { removidos } = await pruneWebhookOutbox(supabase)
    return { result: 'ok', ...result, podados: removidos }
  },
})
