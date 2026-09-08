-- =====================================================================================
-- MIGRATION 071: RLS Políticas para `produto_relacionados`
-- =====================================================================================
-- Contexto:
--   A migration 054 habilitou RLS em `produto_relacionados` mas bloqueou todo acesso
--   para anon e authenticated.
--   No entanto, o painel do admin gerencia produtos relacionados diretamente via cliente web,
--   exigindo privilégios de escrita para Gerente/Administrador/Proprietário.
--   Ademais, o catálogo precisa ler essas relações para exibi-las no checkout.
--
-- Solução:
--   • Remove as políticas restritivas ("deny all anon" e "deny all authenticated").
--   • Cria "Public read produto_relacionados" permitindo SELECT a qualquer role.
--   • Cria "Manage produto_relacionados (gerente+)" permitindo INSERT/UPDATE/DELETE
--     para usuários do painel com papéis de Gerente, Administrador ou Proprietário.
-- =====================================================================================

BEGIN;

-- 1. Remove políticas anteriores restritivas
DROP POLICY IF EXISTS "deny all anon" ON public.produto_relacionados;
DROP POLICY IF EXISTS "deny all authenticated" ON public.produto_relacionados;
DROP POLICY IF EXISTS "Public read produto_relacionados" ON public.produto_relacionados;
DROP POLICY IF EXISTS "Manage produto_relacionados (gerente+)" ON public.produto_relacionados;

-- 2. Permite leitura pública (essencial para checkout do catálogo e painel administrativo)
CREATE POLICY "Public read produto_relacionados" ON public.produto_relacionados
  FOR SELECT TO public
  USING (true);

-- 3. Permite gerenciamento total para Gerente, Administrador e Proprietário
CREATE POLICY "Manage produto_relacionados (gerente+)" ON public.produto_relacionados
  FOR ALL TO public
  USING (private.has_role(ARRAY['gerente'::role_usuario_enum, 'administrador'::role_usuario_enum, 'proprietario'::role_usuario_enum]))
  WITH CHECK (private.has_role(ARRAY['gerente'::role_usuario_enum, 'administrador'::role_usuario_enum, 'proprietario'::role_usuario_enum]));

COMMIT;
