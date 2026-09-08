-- =====================================================================================
-- MIGRATION: Visibilidade de tool calls para o juiz de produção
-- Versão: 106
-- =====================================================================================
-- CONTEXTO: `_docs/implementar/prd-laboratorio-avaliacao-agente.md` §1 (nota de
-- validação em produção, 2026-08-04) — corrida real do laboratório provou que o
-- juiz (`conversationJudge.ts`), sem ver o que as tools de fato retornaram,
-- marca TODO preço/produto/prazo citado pelo agente como `alucinacao`, mesmo
-- quando o dado veio de um retorno real de `BuscarProdutos` (confirmado contra
-- o catálogo real: "Pizza Médio Toscana" R$28, "Bolo Aniversário" R$75,
-- "Cerveja Skol Lata" R$6 — todos produtos de verdade, todos marcados como
-- inventados). A correção do laboratório (migration 105 não precisou de coluna
-- nova — o trace vive só em memória durante a corrida síncrona) usou um hook
-- opcional `onToolCall` em `runAgent`; produção não pode fazer o mesmo porque
-- `evaluate.ts` julga o turno ATÉ 15 MINUTOS depois, num processo (cron)
-- totalmente separado do consumer que executou o turno (`whatsapp-queue.ts`) —
-- não há como passar o trace em memória entre os dois. Precisa persistir.
--
-- `tool_trace` fica em `agente_uso_tokens` (mesma tabela que já guarda `seq`,
-- migration 105, para a mesma finalidade de dar ao juiz uma âncora exata) —
-- não em `whatsapp_conversas`: aquela tabela é o HISTÓRICO QUE O PRÓPRIO
-- AGENTE relê a cada turno (`loadConversationHistory`), e tool calls são
-- deliberadamente andaime interno do turno, não persistem ali (comentário
-- original de `runAgent.ts`) — colocar o trace lá faria o agente OUTRA VEZ ver
-- suas próprias tool calls passadas em todo turno futuro, custo de token sem
-- necessidade. `agente_uso_tokens` é observabilidade interna (RLS
-- `deny_authenticated`, migration 097), nunca lida pelo agente — o lugar certo
-- para um dado que existe só para o juiz auditar depois.
--
-- NULL para turnos anteriores a este deploy (não há como reconstruir
-- retroativamente) — `evaluate.ts` trata `NULL` como "sem esta evidência",
-- preservando o comportamento anterior para linhas antigas, nunca inventando
-- um trace vazio que pareceria "confirmadamente nenhuma tool foi chamada".
-- =====================================================================================

BEGIN;

ALTER TABLE public.agente_uso_tokens
  ADD COLUMN IF NOT EXISTS tool_trace jsonb;

COMMENT ON COLUMN public.agente_uso_tokens.tool_trace IS
  'Tool calls executadas neste turno ([{name,args,result}]) — dá ao juiz (conversationJudge.ts) visibilidade para não marcar dado tool-grounded como alucinação (migration 106). NULL para turnos anteriores a este deploy, nunca [] retroativo.';

COMMIT;

-- =====================================================================================
-- DOWN (rollback manual):
--   ALTER TABLE public.agente_uso_tokens DROP COLUMN IF EXISTS tool_trace;
-- =====================================================================================
