-- =====================================================================================
-- MIGRATION: whatsapp_conversas.seq — ordem determinística do histórico do agente
-- Versão: 091
-- =====================================================================================
-- CONTEXTO: `saveConversationTurn` (server/utils/agent/conversationHistory.ts,
-- seção 6/9 da arquitetura do agente WhatsApp) grava as duas linhas do turno —
-- `user` e `assistant` — num único INSERT. `criado_em` tem DEFAULT `now()`, que
-- em Postgres é o timestamp de INÍCIO DA TRANSAÇÃO, não do statement: as duas
-- linhas nascem com valor IDÊNTICO.
--
-- `loadConversationHistory` ordena só por `criado_em` — com empate, a ordem que
-- o Postgres devolve é indefinida. Na prática o histórico enviado à OpenAI
-- podia sair com a resposta do assistente ANTES da pergunta do cliente, num
-- turno qualquer, de forma não-reprodutível. Não é hipotético: TODO turno do
-- agente produz esse empate.
--
-- `bigserial` dá a ordem de gravação real (a sequência é consumida na ordem dos
-- valores do INSERT). O `id` uuid existente não serve de desempate — é
-- `gen_random_uuid()`, ordem aleatória e estável, o que só tornaria o bug
-- silencioso em vez de intermitente.
--
-- A leitura passa a ordenar por `(criado_em DESC, seq DESC)`: linhas antigas
-- (backfill, `seq` atribuído em ordem física arbitrária) continuam ordenadas
-- por tempo, e só os empates — todos os turnos novos — usam `seq`.
-- =====================================================================================

BEGIN;

ALTER TABLE public.whatsapp_conversas
  ADD COLUMN IF NOT EXISTS seq bigserial;

-- Índice alinhado à ordenação da leitura (cliente_id, criado_em DESC, seq DESC),
-- substituindo o de duas colunas — o antigo não cobria o desempate.
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversas_cliente_criado_seq
  ON public.whatsapp_conversas (cliente_id, criado_em DESC, seq DESC);
DROP INDEX IF EXISTS public.idx_whatsapp_conversas_cliente_criado;

COMMIT;

-- =====================================================================================
-- DOWN (rollback manual):
--   CREATE INDEX IF NOT EXISTS idx_whatsapp_conversas_cliente_criado
--     ON public.whatsapp_conversas (cliente_id, criado_em DESC);
--   DROP INDEX IF EXISTS public.idx_whatsapp_conversas_cliente_criado_seq;
--   ALTER TABLE public.whatsapp_conversas DROP COLUMN IF EXISTS seq;
-- =====================================================================================
