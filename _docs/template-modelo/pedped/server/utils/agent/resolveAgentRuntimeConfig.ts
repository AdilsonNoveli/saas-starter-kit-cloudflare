import type { SupabaseClient } from '@supabase/supabase-js'
import { logger } from '~/core/services/logger.service'
import type { Database } from '~/types/database.types'
import {
  buildWhatsappProviderConfig,
  type RuntimeTokenSource,
  type WhatsappProviderConfig,
} from '../whatsapp/buildWhatsappProviderConfig'

export interface AgentConfig {
  apiKey: string
  model: string
  /** `loja.agente_instrucoes_extra` (migration 088) — repassado a `buildSystemPrompt`. */
  instrucoesExtra?: string | null
  /** `loja.agente_tools_habilitadas` (migration 088) — repassado a `getActiveAgentTools`. */
  activeTools?: readonly string[] | null
  /** `loja.agente_nome` — nome próprio do agente (ex.: "Marcos"). `null`/vazio = sem identidade, comportamento atual. */
  nome?: string | null
  /** `loja.agente_saudacao` — frase de saudação custom. `null`/vazio = `buildSystemPrompt` monta uma padrão a partir do nome. */
  saudacao?: string | null
}

/** Colunas de mídia da migration 093 (§6.1) — consumidas pela fase 6 (produtor/consumer de mídia). */
export interface AgentMediaConfig {
  audioHabilitado: boolean
  imagemHabilitado: boolean
  modeloTranscricao: string
  modeloVisao: string
}

export interface AgentRuntimeConfig {
  /**
   * `null` quando `agente_ativo = false` (agente §8 — desligado cai em
   * atendimento humano) ou quando não há chave OpenAI. Nos dois casos o
   * consumer responde o fallback "agente sem chave configurada" e **não** roda
   * o loop sem client OpenAI.
   */
  agent: AgentConfig | null
  media: AgentMediaConfig
  /**
   * Sempre preenchido, inclusive com `agent: null`: sem transporte não há como
   * mandar nem a mensagem de fallback, e nenhum caminho pode terminar sem
   * resposta ao cliente (§2).
   */
  provider: WhatsappProviderConfig
}

/** Defaults idênticos aos das colunas da migration 093 — valem quando a linha de `loja` não pôde ser lida. */
const MEDIA_DEFAULTS: AgentMediaConfig = {
  audioHabilitado: true,
  imagemHabilitado: true,
  modeloTranscricao: 'gpt-4o-mini-transcribe',
  modeloVisao: 'gpt-4o-mini',
}

/**
 * Resolve, em **um SELECT + até duas RPC de Vault**, tudo que um turno do
 * agente precisa (§3.5 de
 * `_docs/implementar/arquitetura-midia-e-provedor-whatsapp.md`): config do
 * agente + chave OpenAI, config de mídia (§6.1) e config do provedor de
 * WhatsApp. Substitui `resolveOpenAiKeyConfig` (removido) e evita que somar o
 * provedor ao turno virasse 2 SELECT + 2 RPC.
 *
 * As RPC de Vault só são chamadas quando a coluna de referência da chave está
 * preenchida — além de economizar o roundtrip, mantém a superfície de
 * decriptação no mínimo que a §9 exige.
 *
 * Nunca lança: uma falha de leitura devolve `agent: null` com `provider`
 * preenchido, para o consumer ainda conseguir responder ao cliente (§2).
 */
export async function resolveAgentRuntimeConfig(
  supabase: SupabaseClient<Database>,
  runtime: RuntimeTokenSource,
): Promise<AgentRuntimeConfig> {
  const { data: loja, error } = await supabase
    .from('loja')
    // Literal de propósito: `select()` só infere o tipo da linha a partir de
    // uma string literal — montar a lista em runtime devolveria `data` sem tipo.
    .select('agente_ativo, agente_modelo, agente_instrucoes_extra, agente_tools_habilitadas, agente_openai_key_id, agente_nome, agente_saudacao, agente_audio_habilitado, agente_imagem_habilitado, agente_modelo_transcricao, agente_modelo_visao, whatsapp_api_base_url, whatsapp_api_key_id')
    .limit(1)
    .maybeSingle()

  if (error) {
    logger.error('[agent] falha ao ler a configuração da loja — turno segue sem agente, só com o transporte', { error: error.message })
  }

  let providerToken: string | null = null
  if (loja?.whatsapp_api_key_id) {
    const { data, error: vaultError } = await supabase.rpc('whatsapp_api_key_get')
    if (vaultError) {
      logger.error('[whatsapp] falha ao ler o token do provedor no Vault', { error: vaultError.message })
    } else {
      providerToken = data
    }
  }

  const provider = buildWhatsappProviderConfig(
    { baseUrl: loja?.whatsapp_api_base_url, vaultToken: providerToken },
    runtime,
  )

  const media: AgentMediaConfig = loja
    ? {
        audioHabilitado: loja.agente_audio_habilitado,
        imagemHabilitado: loja.agente_imagem_habilitado,
        modeloTranscricao: loja.agente_modelo_transcricao,
        modeloVisao: loja.agente_modelo_visao,
      }
    : MEDIA_DEFAULTS

  return { agent: await resolveAgent(supabase, loja), media, provider }
}

/** Linha de `loja` restrita ao que o agente consome — o SELECT acima é a fonte. */
type LojaAgentRow = Pick<
  Database['public']['Tables']['loja']['Row'],
  'agente_ativo' | 'agente_modelo' | 'agente_instrucoes_extra' | 'agente_tools_habilitadas' | 'agente_openai_key_id' | 'agente_nome' | 'agente_saudacao'
>

/**
 * Os dois caminhos que devolvem `null` aqui são o que o cliente recebe como
 * "Ainda não consegui falar com o atendimento automático" — e até 2026-07-30
 * **os dois eram silenciosos**: o primeiro não logava nada, e o segundo só
 * logava quando havia `error`, nunca quando o Vault devolvia `null`. Depurar o
 * turno exigia adivinhar qual das quatro precondições falhou, com a config
 * intacta no banco quando consultada de fora. Silêncio nesse ponto é a classe de
 * bug que este projeto já pagou várias vezes (§5); o log **nunca** inclui a
 * chave, só qual precondição reprovou.
 */
async function resolveAgent(
  supabase: SupabaseClient<Database>,
  loja: LojaAgentRow | null,
): Promise<AgentConfig | null> {
  if (!loja?.agente_ativo || !loja.agente_openai_key_id) {
    logger.warn('[agent] turno sem agente: precondição da loja não atendida', {
      lojaLida: loja !== null,
      agenteAtivo: loja?.agente_ativo ?? null,
      temKeyId: loja ? loja.agente_openai_key_id !== null : null,
    })
    return null
  }

  const { data: apiKey, error } = await supabase.rpc('agente_openai_key_get')
  if (error || !apiKey) {
    logger.error('[agent] turno sem agente: chave OpenAI não veio do Vault', {
      // Sem `error` e sem chave: o RPC rodou e devolveu NULL — ou o segredo
      // sumiu do Vault, ou `loja.agente_openai_key_id` aponta para um id que
      // não existe mais lá. São diagnósticos diferentes e precisam se distinguir.
      motivo: error ? 'rpc_falhou' : 'vault_devolveu_null',
      error: error?.message ?? null,
    })
    return null
  }

  return {
    apiKey,
    model: loja.agente_modelo,
    instrucoesExtra: loja.agente_instrucoes_extra,
    activeTools: loja.agente_tools_habilitadas as string[] | null,
    nome: loja.agente_nome,
    saudacao: loja.agente_saudacao,
  }
}
