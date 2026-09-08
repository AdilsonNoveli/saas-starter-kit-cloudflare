-- =====================================================================================
-- MIGRATION: Avaliador unificado (LLM-as-a-Judge por janela/conversa)
-- Versão: 105
-- =====================================================================================
-- CONTEXTO: `_docs/implementar/prd-laboratorio-avaliacao-agente.md` — decisão de
-- consolidação (§0): um único juiz (`conversationJudge.ts`), um único schema, dois
-- GATILHOS (produção contínua + laboratório sob demanda), não dois sistemas
-- paralelos. Substitui o julgamento por par isolado (098, `agente_avaliacao_turnos`)
-- por julgamento por janela de mensagens — estritamente mais informativo (achados
-- categorizados com evidência + sugestão) e reprodutível no gatilho de laboratório.
--
-- ⚠️ AÇÃO DESTRUTIVA: esta migration faz `DROP TABLE agente_avaliacao_turnos`.
-- Regra do usuário é zero obsoleto no schema — o formato antigo (score por par
-- isolado) é substituído, não preservado "por histórico" (§5.1/§9 do PRD citado
-- acima). NÃO aplicar em produção sem confirmação explícita no momento — se
-- alguém precisar dos dados antigos, o export é responsabilidade de quem aplica,
-- feito ANTES deste DROP.
--
-- RLS: idêntico ao padrão da 098 — apenas service_role, `authenticated` deny-all
-- explícito (dado de observabilidade interna de IA, nunca exposto ao client do
-- navegador).
-- =====================================================================================

BEGIN;

DROP TABLE IF EXISTS public.agente_avaliacao_turnos;

-- Fecha o gap de precisão que a versão antiga tinha (buscava o par
-- user/assistant por janela de TEMPO, `CONVERSATION_WINDOW_S`, que podia
-- errar se duas mensagens caíssem perto uma da outra — §5 armadilha 12 de
-- `_docs/em-andamento.md`: comparar por proximidade "às vezes funciona", o que
-- é pior que nunca funcionar). `seq` é gravado pelo mesmo INSERT que persiste
-- a resposta do agente (whatsapp-queue.ts), então `loadJudgeWindow` localiza a
-- janela exata via `WHERE seq <= agente_uso_tokens.seq`, sem ambiguidade.
-- NULL para turnos sem cliente_id (mídia, §4 do PRD) — o mesmo gap explícito
-- que já existia, não uma lacuna nova.
ALTER TABLE public.agente_uso_tokens
  ADD COLUMN IF NOT EXISTS seq integer;

COMMENT ON COLUMN public.agente_uso_tokens.seq IS
  'seq (whatsapp_conversas) da resposta do assistente deste turno — gravado pelo mesmo INSERT de saveConversationTurn. Usado por loadJudgeWindow para montar a janela de julgamento sem ambiguidade de timestamp (migration 105).';

CREATE TABLE public.agente_teste_run (
  id            uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  status        text        NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'running', 'done', 'failed')),
  score         smallint    CHECK (score BETWEEN 0 AND 100),
  erro          text,
  iniciado_em   timestamptz NOT NULL DEFAULT now(),
  finalizado_em timestamptz
);

-- Concorrência: só 1 corrida `running` por vez (mesmo padrão de
-- loja_linha_unica_idx, migration 102 — índice único sobre expressão constante).
CREATE UNIQUE INDEX agente_teste_run_unica_ativa
  ON public.agente_teste_run ((true)) WHERE status = 'running';

CREATE TABLE public.agente_avaliacao (
  id               uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  origem           text        NOT NULL CHECK (origem IN ('producao', 'laboratorio')),
  -- Só preenchido quando origem = 'laboratorio' (agrupa as 6 personas de uma corrida).
  run_id           uuid        REFERENCES public.agente_teste_run(id) ON DELETE CASCADE,
  persona          text,
  -- Só preenchido quando origem = 'producao' (referência ao turno que disparou).
  uso_id           uuid        REFERENCES public.agente_uso_tokens(id) ON DELETE CASCADE,
  cliente_id       uuid        REFERENCES public.clientes(id),
  modelo_avaliador text        NOT NULL,
  -- Mensagens julgadas (role+content) — janela de produção ou conversa simulada completa.
  janela           jsonb       NOT NULL,
  status           text        NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending', 'running', 'done', 'judge_failed', 'failed')),
  veredicto        text        CHECK (veredicto IN ('verde', 'amarelo', 'vermelho')),
  achados          jsonb,
  tokens_avaliacao integer,
  avaliado_em      timestamptz NOT NULL DEFAULT now(),

  -- Par de campos condicionado à origem — nunca os dois nulos nem os dois
  -- preenchidos. Fecha o gap de uma linha 'producao' gravada com run_id por
  -- engano de código, que quebraria silenciosamente o agrupamento de uma
  -- corrida do laboratório (mesma filosofia de clientes_pausado_par_chk, 104).
  CONSTRAINT agente_avaliacao_origem_chk CHECK (
    (origem = 'laboratorio' AND run_id IS NOT NULL AND persona IS NOT NULL AND uso_id IS NULL)
    OR
    (origem = 'producao' AND uso_id IS NOT NULL AND run_id IS NULL AND persona IS NULL)
  )
);

ALTER TABLE public.clientes
  ADD COLUMN IF NOT EXISTS e_teste_laboratorio boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.clientes.e_teste_laboratorio IS
  'Cliente sintético criado pelo laboratório de avaliação (telefone 5521999990000+índice, DDD 21 reservado). Deliberadamente não reaproveita `arquivado` (armadilha 6 de _docs/em-andamento.md) nem `is_visitante` — propósito único. Filtrar = false em listagens de clientes reais (app/pages/admin/customers/index.vue).';

ALTER TABLE public.agente_avaliacao   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agente_teste_run   ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all_agente_avaliacao"
  ON public.agente_avaliacao
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "deny_authenticated_agente_avaliacao"
  ON public.agente_avaliacao
  FOR ALL
  TO authenticated
  USING (false);

CREATE POLICY "service_role_all_agente_teste_run"
  ON public.agente_teste_run
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "deny_authenticated_agente_teste_run"
  ON public.agente_teste_run
  FOR ALL
  TO authenticated
  USING (false);

-- Dashboard lê por período (produção: tendência contínua) e por corrida (laboratório).
CREATE INDEX IF NOT EXISTS idx_agente_avaliacao_avaliado_em
  ON public.agente_avaliacao (avaliado_em DESC);

CREATE INDEX IF NOT EXISTS idx_agente_avaliacao_origem_avaliado_em
  ON public.agente_avaliacao (origem, avaliado_em DESC);

CREATE INDEX IF NOT EXISTS idx_agente_avaliacao_run_id
  ON public.agente_avaliacao (run_id);

CREATE INDEX IF NOT EXISTS idx_agente_avaliacao_uso_id
  ON public.agente_avaliacao (uso_id);

CREATE INDEX IF NOT EXISTS idx_agente_avaliacao_cliente_id
  ON public.agente_avaliacao (cliente_id, avaliado_em DESC);

COMMIT;

-- =====================================================================================
-- DOWN (rollback manual):
--   ALTER TABLE public.clientes DROP COLUMN IF EXISTS e_teste_laboratorio;
--   DROP TABLE IF EXISTS public.agente_avaliacao;
--   DROP TABLE IF EXISTS public.agente_teste_run;
--   -- agente_avaliacao_turnos não é restaurável por esta migration — export
--   -- manual antes do DROP é a única forma de recuperar o dado antigo.
-- =====================================================================================
