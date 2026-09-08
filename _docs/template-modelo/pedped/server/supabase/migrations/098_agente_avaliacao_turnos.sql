-- =====================================================================================
-- MIGRATION: Tabela de avaliações LLM-as-a-Judge
-- Versão: 098
-- =====================================================================================
-- Contexto: a task agendada `agent:evaluate` (Nitro scheduled task, cron */15 min)
-- utiliza um modelo menor e mais barato (agente_modelo_avaliador, migration 097)
-- para avaliar amostras de turnos do agente conversacional. Um registro por turno.
--
-- RLS: apenas service_role — dados de observabilidade interna de IA, nunca expostos
-- via Supabase client autenticado ao navegador. A leitura no dashboard é feita
-- via rota de API com service role, não via client RLS.
--
-- Referência: 1:1 com agente_uso_tokens via uso_id (CASCADE DELETE garante
-- que remoção de telemetria apaga a avaliação associada).
-- =====================================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.agente_avaliacao_turnos (
  id                uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  uso_id            uuid        REFERENCES public.agente_uso_tokens(id) ON DELETE CASCADE,
  cliente_id        uuid        REFERENCES public.clientes(id),
  modelo_avaliador  text        NOT NULL,
  tarefa_concluida  boolean,
  cliente_frustrado boolean,
  -- 0 = péssimo, 10 = excelente. NULL quando o judge não conseguiu avaliar.
  score_qualidade   smallint    CHECK (score_qualidade BETWEEN 0 AND 10),
  -- 1–2 frases do avaliador explicando o score (para debugging — nunca exibir ao cliente).
  resumo            text,
  -- Custo do próprio judge em tokens (para contabilizar junto ao total de IA).
  tokens_avaliacao  integer,
  avaliado_em       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.agente_avaliacao_turnos ENABLE ROW LEVEL SECURITY;

-- service_role: acesso total (task agendada + rota de API do dashboard).
CREATE POLICY "service_role_all_agente_avaliacao_turnos"
  ON public.agente_avaliacao_turnos
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- authenticated: bloqueio explícito — dados internos de IA não devem ser
-- lidos via client Supabase autenticado do navegador (deny-all policy).
CREATE POLICY "deny_authenticated_agente_avaliacao_turnos"
  ON public.agente_avaliacao_turnos
  FOR ALL
  TO authenticated
  USING (false);

-- Índice primário de leitura: dashboard lê por período (avaliado_em DESC).
CREATE INDEX IF NOT EXISTS idx_agente_avaliacao_turnos_avaliado_em
  ON public.agente_avaliacao_turnos (avaliado_em DESC);

-- Índice para lookup de avaliação por turno (evita dupla-avaliação).
CREATE INDEX IF NOT EXISTS idx_agente_avaliacao_turnos_uso_id
  ON public.agente_avaliacao_turnos (uso_id);

-- Índice para análise por cliente (perfil de qualidade de atendimento).
CREATE INDEX IF NOT EXISTS idx_agente_avaliacao_turnos_cliente_id
  ON public.agente_avaliacao_turnos (cliente_id, avaliado_em DESC);

COMMIT;

-- =====================================================================================
-- DOWN (rollback manual):
--   DROP TABLE IF EXISTS public.agente_avaliacao_turnos;
-- =====================================================================================
