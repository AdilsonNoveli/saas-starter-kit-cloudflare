/**
 * Ciclo de avaliação do LLM-as-a-Judge — lógica compartilhada entre a task
 * agendada `agent:evaluate` (`server/tasks/agent/evaluate.ts`, cron a cada 15
 * minutos, sem mudança — ver
 * `_docs/implementar/prd-achados-recorrentes-e-insights-negocio.md` §4.2) e o
 * endpoint admin sob demanda (`POST /api/admin/ai-quality/evaluate-now`, §4.3
 * fase C3). Extraído de dentro de `evaluate.ts` (fase C2) para não duplicar
 * busca/julgamento/gravação entre os dois gatilhos.
 */
import type OpenAI from 'openai'
import type { SupabaseClient } from '@supabase/supabase-js'
import { logger } from '~/core/services/logger.service'
import type { Database, Json } from '~/types/database.types'
import { judgeConversation, type JudgeToolCall } from './conversationJudge'
import { loadJudgeWindow } from './conversationHistory'
import { AGENT_JUDGE_RULES } from './systemPrompt'

/** Máximo de turnos avaliados por execução — garante que o ciclo termine em tempo hábil. */
export const MAX_PER_CYCLE = 20

/** Tamanho da janela de julgamento — ~3 pares, contexto real sem custo de julgar a conversa inteira. */
export const JUDGE_WINDOW_SIZE = 6

export interface LojaEvaluatorConfig {
  readonly modeloAvaliador: string
  readonly apiKey: string
  readonly instrucoesExtra: string
}

export async function resolveEvaluatorConfig(
  supabase: SupabaseClient<Database>,
): Promise<LojaEvaluatorConfig | null> {
  const { data: loja, error: lojaError } = await supabase
    .from('loja')
    .select('agente_modelo_avaliador, agente_openai_key_id, agente_instrucoes_extra')
    .limit(1)
    .maybeSingle()

  if (lojaError || !loja?.agente_openai_key_id) {
    logger.warn('[agent:evaluate] sem chave OpenAI configurada — task pulada', {
      error: lojaError?.message ?? 'agente_openai_key_id ausente',
    })
    return null
  }

  const { data: apiKey, error: vaultError } = await supabase.rpc('agente_openai_key_get')
  if (vaultError || !apiKey) {
    logger.error('[agent:evaluate] falha ao ler chave OpenAI do Vault', {
      error: vaultError?.message ?? 'chave vazia',
    })
    return null
  }

  return {
    modeloAvaliador: loja.agente_modelo_avaliador,
    apiKey,
    instrucoesExtra: loja.agente_instrucoes_extra ?? '',
  }
}

interface PendingTurn {
  readonly id: string
  readonly clienteId: string | null
  readonly seq: number | null
  /**
   * Tool calls do turno (migration 106) — dá ao juiz visibilidade do que foi
   * realmente retornado, para não marcar dado tool-grounded como alucinação
   * (§1 do PRD do laboratório, validação de 2026-08-04). `null` para turnos
   * anteriores a este deploy — `undefined` é passado ao juiz nesse caso
   * (comportamento anterior preservado), nunca um array vazio inventado.
   */
  readonly toolTrace: readonly JudgeToolCall[] | null
}

async function fetchPendingTurns(
  supabase: SupabaseClient<Database>,
): Promise<readonly PendingTurn[]> {
  const { data, error } = await supabase
    .from('agente_uso_tokens')
    .select('id, cliente_id, seq, tool_trace')
    .eq('avaliacao_pendente', true)
    .order('criado_em', { ascending: true })
    .limit(MAX_PER_CYCLE)

  if (error) {
    logger.error('[agent:evaluate] falha ao buscar turnos pendentes', { error: error.message })
    return []
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    clienteId: row.cliente_id,
    seq: row.seq,
    toolTrace: row.tool_trace as readonly JudgeToolCall[] | null,
  }))
}

async function markEvaluated(
  supabase: SupabaseClient<Database>,
  usoId: string,
): Promise<void> {
  const { error } = await supabase
    .from('agente_uso_tokens')
    .update({ avaliacao_pendente: false })
    .eq('id', usoId)

  if (error) {
    logger.warn('[agent:evaluate] falha ao marcar avaliacao_pendente=false', {
      usoId,
      error: error.message,
    })
  }
}

export interface EvaluationCycleResult {
  readonly avaliados: number
  readonly erros: number
  readonly total: number
}

/**
 * Roda um ciclo completo: busca turnos pendentes (até `MAX_PER_CYCLE`), julga
 * cada um e grava o resultado em `agente_avaliacao`. Usado tanto pelo cron
 * quanto pelo botão "Avaliar agora" — mesmo comportamento nos dois gatilhos.
 */
export async function runEvaluationCycle(
  supabase: SupabaseClient<Database>,
  openai: OpenAI,
  evaluatorConfig: LojaEvaluatorConfig,
): Promise<EvaluationCycleResult> {
  const pendingTurns = await fetchPendingTurns(supabase)

  let avaliados = 0
  let erros = 0

  for (const turn of pendingTurns) {
    // Turno sem cliente_id (mídia sem cliente associado) ou sem seq (turno
    // anterior à migration 105) não tem janela rastreável — marca como
    // avaliado para não ficar preso. Mesmo comportamento da versão antiga,
    // agora explícito, não uma lacuna silenciosa.
    if (!turn.clienteId || turn.seq === null) {
      await markEvaluated(supabase, turn.id)
      continue
    }

    const janela = await loadJudgeWindow(supabase, turn.clienteId, turn.seq, JUDGE_WINDOW_SIZE)

    if (janela.length === 0) {
      logger.warn('[agent:evaluate] janela vazia para turno', { usoId: turn.id })
      await markEvaluated(supabase, turn.id)
      erros++
      continue
    }

    const verdict = await judgeConversation(openai, evaluatorConfig.modeloAvaliador, {
      janela,
      regras: AGENT_JUDGE_RULES,
      instrucoesExtra: evaluatorConfig.instrucoesExtra,
      contexto: 'conversa real',
      toolCalls: turn.toolTrace ?? undefined,
    })

    if (verdict.status === 'done') {
      const { error: insertError } = await supabase.from('agente_avaliacao').insert({
        origem: 'producao',
        uso_id: turn.id,
        cliente_id: turn.clienteId,
        modelo_avaliador: evaluatorConfig.modeloAvaliador,
        janela: janela as unknown as Json,
        status: 'done',
        veredicto: verdict.verdict.veredicto,
        achados: verdict.verdict.achados,
        tokens_avaliacao: verdict.tokens,
      })

      if (insertError) {
        logger.error('[agent:evaluate] falha ao gravar avaliação', {
          usoId: turn.id,
          error: insertError.message,
        })
        erros++
      } else {
        avaliados++
      }
    } else {
      logger.warn('[agent:evaluate] juiz falhou ao avaliar turno', { usoId: turn.id, detail: verdict.detail })
      const { error: insertError } = await supabase.from('agente_avaliacao').insert({
        origem: 'producao',
        uso_id: turn.id,
        cliente_id: turn.clienteId,
        modelo_avaliador: evaluatorConfig.modeloAvaliador,
        janela: janela as unknown as Json,
        status: 'judge_failed',
      })
      if (insertError) {
        logger.error('[agent:evaluate] falha ao gravar judge_failed', {
          usoId: turn.id,
          error: insertError.message,
        })
      }
      erros++
    }

    // Marca como avaliado independentemente do resultado — evita retry infinito.
    await markEvaluated(supabase, turn.id)
  }

  return { avaliados, erros, total: pendingTurns.length }
}
