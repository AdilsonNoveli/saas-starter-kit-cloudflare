-- =====================================================================================
-- MIGRATION: Deny-all explícito em integration_idempotency
-- Versão: 058
-- =====================================================================================
-- Resolve o linter INFO 0008 (rls_enabled_no_policy): a tabela tem RLS ON e
-- nenhuma policy (acesso exclusivo via service_role, que bypassa RLS). Torna a
-- intenção explícita com o mesmo padrão de cart_items/contexto_user (migration
-- 039). Comportamento inalterado: anon/authenticated permanecem sem acesso.
-- =====================================================================================

BEGIN;

DROP POLICY IF EXISTS "No client access" ON public.integration_idempotency;
CREATE POLICY "No client access" ON public.integration_idempotency
  FOR ALL TO anon, authenticated
  USING (false) WITH CHECK (false);

COMMIT;
