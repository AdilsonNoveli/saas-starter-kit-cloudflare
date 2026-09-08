-- =====================================================================================
-- MIGRATION: Observabilidade do agente — rounds, avaliacao_pendente, modelo_avaliador
-- Versão: 097
-- =====================================================================================
-- Contexto:
--   - rounds (integer, nullable): número de rounds de tool_calls executados no turno
--     (1–MAX_AGENT_ROUNDS=8). NULL em registros de mídia (transcrição/visão não têm
--     loop de tool calls) — semanticamente correto, não confundir com zero rounds.
--   - avaliacao_pendente (boolean, default true): flag para o LLM-as-a-Judge
--     (task agent:evaluate). Setado para false após avaliação ou após falha
--     tolerada, evitando retry infinito.
--   - agente_modelo_avaliador (text, default 'gpt-4.1-mini'): modelo escolhido
--     pelo lojista para o Avaliador de Qualidade (migration 098).
-- =====================================================================================

BEGIN;

ALTER TABLE public.agente_uso_tokens
  ADD COLUMN IF NOT EXISTS rounds             integer,
  ADD COLUMN IF NOT EXISTS avaliacao_pendente boolean NOT NULL DEFAULT true;

-- Índice parcial: a task agent:evaluate lê apenas pendentes, ordenado por data
-- (avalia os mais antigos primeiro). Filtra os já avaliados fora do scan.
CREATE INDEX IF NOT EXISTS idx_agente_uso_tokens_pendente_criado_em
  ON public.agente_uso_tokens (criado_em ASC)
  WHERE avaliacao_pendente = true;

-- Índice para análise de turnos "pesados" no dashboard (rounds = MAX_AGENT_ROUNDS).
CREATE INDEX IF NOT EXISTS idx_agente_uso_tokens_rounds
  ON public.agente_uso_tokens (rounds)
  WHERE rounds IS NOT NULL;

-- Modelo avaliador: escolhido pelo lojista, salvo junto com config da loja.
-- Default igual ao padrão de OPENAI_JUDGE_MODELS em shared/types/agent.ts.
ALTER TABLE public.loja
  ADD COLUMN IF NOT EXISTS agente_modelo_avaliador text NOT NULL DEFAULT 'gpt-4.1-mini';

COMMIT;

-- =====================================================================================
-- DOWN (rollback manual):
--   ALTER TABLE public.agente_uso_tokens
--     DROP COLUMN IF EXISTS rounds,
--     DROP COLUMN IF EXISTS avaliacao_pendente;
--   DROP INDEX IF EXISTS idx_agente_uso_tokens_pendente_criado_em;
--   DROP INDEX IF EXISTS idx_agente_uso_tokens_rounds;
--   ALTER TABLE public.loja
--     DROP COLUMN IF EXISTS agente_modelo_avaliador;
-- =====================================================================================
