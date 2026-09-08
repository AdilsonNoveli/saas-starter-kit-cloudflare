import type { SupabaseClient } from '@supabase/supabase-js'
import { logger } from '~/core/services/logger.service'
import type { Database } from '~/types/database.types'
import {
  buildWhatsappProviderConfig,
  type RuntimeTokenSource,
  type WhatsappProviderConfig,
} from './buildWhatsappProviderConfig'
import type { InboundMediaFlags } from './inboundMediaPolicy'

/**
 * Tudo que o **produtor** (webhook) precisa, em **um SELECT + até uma RPC de
 * Vault**: o transporte (URL base da coluna `loja.whatsapp_api_base_url` +
 * token do Supabase Vault via `whatsapp_api_key_get()`, migration 093, §3.1) e
 * as flags de mídia da §6.1, que decidem as recusas síncronas da §7.4.
 *
 * O I/O é aqui; a decisão entre Vault, fallback de env e nenhum dos dois é de
 * `buildWhatsappProviderConfig`. Nunca lança: uma falha de leitura não pode
 * derrubar o webhook antes de o cliente receber alguma resposta (§2).
 *
 * **Quem usa:** só o produtor. O consumer usa `resolveAgentRuntimeConfig`, que
 * traz também a chave da OpenAI e os modelos (§3.5). O produtor continua
 * separado de propósito: ele nunca chama a OpenAI, e decriptar a chave dela no
 * webhook ampliaria a superfície de decriptação que a §9 limita a "escrita e
 * uso em runtime".
 */
export interface WebhookRuntimeConfig {
  provider: WhatsappProviderConfig
  media: InboundMediaFlags
}

/** Idênticas aos defaults das colunas da migration 093 — valem quando a linha não pôde ser lida. */
const DEFAULT_MEDIA_FLAGS: InboundMediaFlags = { audioHabilitado: true, imagemHabilitado: true }

export async function resolveWebhookRuntimeConfig(
  supabase: SupabaseClient<Database>,
  runtime: RuntimeTokenSource,
): Promise<WebhookRuntimeConfig> {
  const { data: loja, error: lojaError } = await supabase
    .from('loja')
    // Literal de propósito: `select()` só infere o tipo da linha a partir de
    // uma string literal — montar a lista em runtime devolveria `data` sem tipo.
    .select('whatsapp_api_base_url, whatsapp_api_key_id, agente_audio_habilitado, agente_imagem_habilitado')
    .limit(1)
    .maybeSingle()

  if (lojaError) {
    logger.error('[whatsapp] falha ao ler a configuração do webhook — usando os padrões', { error: lojaError.message })
  }

  let vaultToken: string | null = null
  if (loja?.whatsapp_api_key_id) {
    const { data, error } = await supabase.rpc('whatsapp_api_key_get')
    if (error) {
      logger.error('[whatsapp] falha ao ler o token do provedor no Vault', { error: error.message })
    } else {
      vaultToken = data
    }
  }

  return {
    provider: buildWhatsappProviderConfig({ baseUrl: loja?.whatsapp_api_base_url, vaultToken }, runtime),
    media: loja
      ? { audioHabilitado: loja.agente_audio_habilitado, imagemHabilitado: loja.agente_imagem_habilitado }
      : DEFAULT_MEDIA_FLAGS,
  }
}
