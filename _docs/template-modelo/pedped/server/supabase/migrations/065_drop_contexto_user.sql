-- =====================================================================================
-- MIGRATION: Remover tabela contexto_user (obsoleta)
-- Versão: 065
-- =====================================================================================
-- A "memória do cliente" do fluxo agentivo passou a usar as colunas de `clientes`
-- (preferencias, contexto_resumo, tem_contexto, ultima_conversa) — ver o endpoint
-- PATCH /api/integration/v1/customers/context. A tabela contexto_user (arquétipos,
-- Fase 8) nunca foi implementada na aplicação e foi descartada.
--
-- Já refletido no init.sql. Esta migration aplica a remoção em bancos já provisionados.
-- Idempotente. Os enums arquetipo_enum/trigger_classificacao_enum eram usados apenas
-- por esta tabela; DROP TABLE ... CASCADE remove trigger, policy RLS e a FK associada.
-- =====================================================================================

BEGIN;

DROP TABLE IF EXISTS public.contexto_user CASCADE;

DROP TYPE IF EXISTS public.arquetipo_enum;
DROP TYPE IF EXISTS public.trigger_classificacao_enum;

COMMIT;
