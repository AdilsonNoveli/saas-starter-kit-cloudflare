-- =====================================================================================
-- MIGRATION 039: Deny-all explícito em cart_items e contexto_user
-- Aplicada em produção (sales_delivery) em 2026-07-04.
-- Resolve o INFO 0008 rls_enabled_no_policy: as tabelas têm RLS ON e nenhuma policy
-- (acesso exclusivo via service_role, que bypassa RLS). Tornamos a intenção explícita.
-- Comportamento inalterado: clientes (anon/authenticated) continuam sem acesso.
-- =====================================================================================

BEGIN;

DROP POLICY IF EXISTS "No client access" ON public.cart_items;
CREATE POLICY "No client access" ON public.cart_items
  FOR ALL TO anon, authenticated
  USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "No client access" ON public.contexto_user;
CREATE POLICY "No client access" ON public.contexto_user
  FOR ALL TO anon, authenticated
  USING (false) WITH CHECK (false);

COMMIT;
