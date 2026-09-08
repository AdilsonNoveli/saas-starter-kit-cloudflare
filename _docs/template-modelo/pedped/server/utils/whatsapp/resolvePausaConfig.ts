import type { SupabaseClient } from '@supabase/supabase-js'
import { logger } from '~/core/services/logger.service'
import type { Database } from '~/types/database.types'

export interface PausaConfig {
  /** `loja.agente_pausa_humana_minutos` — janela deslizante (§0.5.2 item g). */
  minutos: number
  /** `loja.agente_pausa_humana_ativo` — desligado, o echo do humano nunca pausa. */
  ativo: boolean
}

/** Idênticos aos defaults das colunas da migration 104 — valem quando a linha não pôde ser lida. */
const DEFAULT_PAUSA_CONFIG: PausaConfig = { minutos: 15, ativo: true }

/**
 * Só o que o tratamento de echo precisa (`handleEchoEvent.ts`) — separado de
 * `resolveWebhookRuntimeConfig` de propósito: aquele também decripta o token
 * do provedor no Vault quando há chave cadastrada, e o echo nunca envia nada
 * de volta ao cliente, então nunca precisa do transporte.
 */
export async function resolvePausaConfig(supabase: SupabaseClient<Database>): Promise<PausaConfig> {
  const { data, error } = await supabase
    .from('loja')
    .select('agente_pausa_humana_minutos, agente_pausa_humana_ativo')
    .limit(1)
    .maybeSingle()

  if (error) {
    logger.error('[whatsapp] falha ao ler a config de pausa humana — usando os padrões', { error: error.message })
    return DEFAULT_PAUSA_CONFIG
  }
  if (!data) return DEFAULT_PAUSA_CONFIG

  return {
    minutos: data.agente_pausa_humana_minutos,
    ativo: data.agente_pausa_humana_ativo,
  }
}
