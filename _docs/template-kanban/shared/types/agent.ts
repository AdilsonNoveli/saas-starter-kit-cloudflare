/**
 * Tipos e constantes dos modelos OpenAI usados pelo sistema Revunei AI.
 *
 * Fonte única de verdade (DRY) — reutilizada em:
 *   - `/admin/settings` (selects de modelo conversacional e avaliador)
 *   - `/admin/dashboard` (cálculo de custo estimado por modelo)
 *   - `server/utils/agent/evaluator.ts` (validação do modelo avaliador)
 *
 * Preços em USD por milhão de tokens, conforme tabela pública da OpenAI.
 * Atualizar aqui propaga para todos os consumidores.
 */

export interface OpenAiModelOption {
  readonly value: string
  readonly label: string
  /** USD por 1.000.000 tokens de input (prompt). */
  readonly inputCostPerMToken: number
  /** USD por 1.000.000 tokens de output (completion). */
  readonly outputCostPerMToken: number
}

/** Modelos disponíveis para o agente conversacional do WhatsApp. */
export const OPENAI_CONVERSATIONAL_MODELS: readonly OpenAiModelOption[] = [
  {
    value: 'gpt-4.1-mini',
    label: 'GPT-4.1 mini (padrão, custo baixo)',
    inputCostPerMToken: 0.40,
    outputCostPerMToken: 1.60,
  },
  {
    value: 'gpt-4.1',
    label: 'GPT-4.1',
    inputCostPerMToken: 2.00,
    outputCostPerMToken: 8.00,
  },
  {
    value: 'gpt-4o-mini',
    label: 'GPT-4o mini',
    inputCostPerMToken: 0.15,
    outputCostPerMToken: 0.60,
  },
] as const

/** Modelos disponíveis para o Avaliador de Qualidade (LLM-as-a-Judge). */
export const OPENAI_JUDGE_MODELS: readonly OpenAiModelOption[] = [
  {
    value: 'gpt-4.1-mini',
    label: 'GPT-4.1 mini (recomendado — barato e preciso)',
    inputCostPerMToken: 0.40,
    outputCostPerMToken: 1.60,
  },
  {
    value: 'gpt-4o-mini',
    label: 'GPT-4o mini',
    inputCostPerMToken: 0.15,
    outputCostPerMToken: 0.60,
  },
] as const

/**
 * Modelos de mídia (`loja.agente_modelo_transcricao`/`agente_modelo_visao`,
 * migration 093) — não aparecem em nenhum select porque essas colunas são
 * texto livre, não um catálogo fechado como o conversacional. `gpt-4o-mini`
 * (visão) já está em `OPENAI_CONVERSATIONAL_MODELS`, então só o modelo de
 * transcrição precisa de entrada própria aqui.
 *
 * Cobrança por tokens só quando a API devolve `usage.type === 'tokens'`
 * (`transcribeAudio.ts`) — cobrança por duração não grava tokens em
 * `agente_uso_tokens` e não passa por `estimateCostUsd`.
 */
export const OPENAI_MEDIA_MODELS: readonly OpenAiModelOption[] = [
  {
    value: 'gpt-4o-mini-transcribe',
    label: 'GPT-4o mini Transcribe',
    inputCostPerMToken: 3.00,
    outputCostPerMToken: 5.00,
  },
] as const

/**
 * União de todos os modelos que gravam telemetria em `agente_uso_tokens` —
 * usado só pelo cálculo de custo do dashboard (`ai-usage.get.ts`), nunca por
 * um select de configuração (que precisa do catálogo específico, não da união).
 */
export const OPENAI_ALL_BILLABLE_MODELS: readonly OpenAiModelOption[] = [
  ...OPENAI_CONVERSATIONAL_MODELS,
  ...OPENAI_MEDIA_MODELS,
] as const

/**
 * Calcula o custo estimado em USD dado o volume de tokens e o modelo.
 * Retorna `null` quando o modelo não está na lista (config legada fora do
 * vocabulário atual, ou catálogo passado não cobre o modelo gravado).
 */
export function estimateCostUsd(
  promptTokens: number,
  completionTokens: number,
  modelValue: string,
  catalog: readonly OpenAiModelOption[] = OPENAI_CONVERSATIONAL_MODELS,
): number | null {
  const model = catalog.find((m) => m.value === modelValue)
  if (!model) return null
  return (
    (promptTokens / 1_000_000) * model.inputCostPerMToken
    + (completionTokens / 1_000_000) * model.outputCostPerMToken
  )
}
