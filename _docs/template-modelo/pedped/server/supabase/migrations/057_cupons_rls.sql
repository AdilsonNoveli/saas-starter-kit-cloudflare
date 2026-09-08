-- MIGRATION: Adicionar permissões RLS para tabela cupons (gerente+)
BEGIN;

DROP POLICY IF EXISTS "cupons: deny client access" ON public.cupons;

-- O cliente continua não tendo acesso direto de leitura/escrita, o BFF que acessa via service_role.
-- Mas os administradores precisam de acesso ALL (leitura, inserção, update, delete).
CREATE POLICY "Manage cupons (gerente+)" ON public.cupons
FOR ALL TO authenticated
USING (private.has_role(ARRAY['gerente','administrador','proprietario']::public.role_usuario_enum[]))
WITH CHECK (private.has_role(ARRAY['gerente','administrador','proprietario']::public.role_usuario_enum[]));

COMMIT;
