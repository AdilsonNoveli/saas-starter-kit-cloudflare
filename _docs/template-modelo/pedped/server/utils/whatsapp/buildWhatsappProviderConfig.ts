/**
 * Montagem **pura** da config do provedor de WhatsApp: dada a linha de `loja`
 * já lida e o token já decriptado do Vault, decide entre Vault, fallback de env
 * e "nenhum dos dois" (§3.2 de
 * `_docs/implementar/arquitetura-midia-e-provedor-whatsapp.md`).
 *
 * Existe separado do resolver porque dois caminhos precisam da mesma decisão a
 * partir de I/O diferente: `resolveWhatsappProviderConfig` (produtor — 1 SELECT
 * próprio) e `resolveAgentRuntimeConfig` (consumer — SELECT único que também
 * traz agente e mídia, §3.5). Duplicar o fallback e o aviso de depreciação nos
 * dois seria a violação de DRY que a §2 proíbe; o resolver faz o I/O, este
 * módulo monta.
 */
import { logger } from '~/core/services/logger.service'
import type { CloudApiClientConfig } from './cloudApiClient'

export interface WhatsappProviderConfig extends CloudApiClientConfig {
  /**
   * `true` quando o token veio de `NUXT_WHATSAPP_API_TOKEN` em vez do Vault
   * (§3.2). Só existe para o card em `/admin/integrations` avisar o lojista —
   * o caminho de envio não muda em nada.
   */
  usandoFallbackEnv: boolean
}

/** Formato mínimo do `runtimeConfig` consumido aqui — mantém a função testável sem Nitro. */
export interface RuntimeTokenSource {
  whatsappApiToken?: unknown
}

/** O que o I/O precisa entregar ao builder: a coluna da URL e o token já decriptado. */
export interface WhatsappProviderSource {
  /** `loja.whatsapp_api_base_url` (migration 093); em branco/ausente cai no default. */
  baseUrl?: string | null
  /** Retorno de `whatsapp_api_key_get()`, ou `null` quando não há chave ou a leitura falhou. */
  vaultToken?: string | null
}

/**
 * Há credencial legada em `NUXT_WHATSAPP_API_TOKEN`? Usado pelos endpoints do
 * card para avisar o lojista de que o envio ainda depende de env — nunca para
 * decidir o transporte, que sai sempre de `buildWhatsappProviderConfig`.
 */
export function hasLegacyEnvToken(runtime: RuntimeTokenSource): boolean {
  return typeof runtime.whatsappApiToken === 'string' && runtime.whatsappApiToken.length > 0
}

/**
 * **Fallback de env (§3.2), deliberadamente temporário:** sem token no Vault,
 * cai para `runtimeConfig.whatsappApiToken` e loga um aviso de depreciação.
 * Sem isso, aplicar a migration derrubaria o agente em produção até alguém
 * abrir o admin — com ele, a transição é sem downtime. A remoção do fallback e
 * da env é a fase 8 da §11, não um "depois" indefinido.
 *
 * Nunca lança: sem nenhum token disponível devolve `apiToken: ''` e o envio
 * falha adiante com o erro do provedor, que é mais informativo do que uma
 * exceção nossa aqui — o turno não pode morrer antes de tentar responder (§2).
 */
export function buildWhatsappProviderConfig(
  row: WhatsappProviderSource,
  runtime: RuntimeTokenSource,
): WhatsappProviderConfig {
  // Sem fallback de fornecedor: URL vazia é configuração faltando, e disfarçá-la
  // com o endereço de um provedor específico é o acoplamento que a 103 removeu.
  // Não lança, pelo mesmo motivo do token: o turno falha adiante com o erro do
  // provedor, que diz mais do que uma exceção nossa aqui (§2).
  const baseUrl = row.baseUrl?.trim() || ''
  if (!baseUrl) {
    logger.error('[whatsapp] URL base do provedor não configurada — cadastre o provedor em /admin/integrations')
  }

  if (row.vaultToken) {
    return { apiToken: row.vaultToken, baseUrl, usandoFallbackEnv: false }
  }

  if (hasLegacyEnvToken(runtime)) {
    logger.warn('[whatsapp] token do provedor vindo de NUXT_WHATSAPP_API_TOKEN (legado, descontinuado) — cadastre o token em /admin/integrations para poder trocar de provedor sem deploy')
    return { apiToken: runtime.whatsappApiToken as string, baseUrl, usandoFallbackEnv: true }
  }

  logger.error('[whatsapp] nenhum token de provedor configurado — nem no Vault, nem em NUXT_WHATSAPP_API_TOKEN; o agente não conseguirá responder')
  return { apiToken: '', baseUrl, usandoFallbackEnv: false }
}
