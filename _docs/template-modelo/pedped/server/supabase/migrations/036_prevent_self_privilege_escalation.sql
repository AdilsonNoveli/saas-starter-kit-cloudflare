-- =====================================================================================
-- MIGRATION: Prevenção de escalonamento de privilégio via self-update em `usuarios`
-- Versão: 036
-- Descrição:
--   A policy "Self update own profile" (init.sql) permite que o usuário atualize
--   a própria linha em `public.usuarios` com `WITH CHECK (id = auth.uid())`. Como
--   `role` e `ativo` vivem na mesma linha e o RLS do Postgres não faz checagem por
--   coluna, um usuário autenticado de baixo privilégio (ex.: entregador/atendente)
--   podia, direto do cliente com a anon key:
--
--       supabase.from('usuarios').update({ role: 'proprietario' }).eq('id', <self>)
--
--   → auto-promoção a proprietário (comprometimento total).
--
--   Este trigger BEFORE UPDATE rejeita qualquer alteração de `role` ou `ativo`
--   feita sobre a PRÓPRIA linha por quem NÃO for administrador/proprietário.
--   A gestão legítima de papéis continua funcionando: administradores/proprietários
--   alteram papéis de terceiros (e os seus) via a policy "Admins manage usuarios",
--   e o endpoint /api/admin/users usa service_role (que não dispara este bloqueio
--   pois has_role() para service_role não se aplica — ver nota abaixo).
--
-- NOTA sobre service_role:
--   `has_role()` consulta `public.usuarios` por `auth.uid()`. Sob service_role,
--   `auth.uid()` é NULL → has_role() retorna false. Para não quebrar os fluxos
--   administrativos que rodam com service_role (Auth Admin API), o trigger só
--   bloqueia quando `auth.uid() = OLD.id` (isto é, o usuário mexendo em si mesmo).
--   service_role editando OUTro usuário nunca cai nessa condição; e ao editar a
--   própria linha via painel admin o fluxo usa a sessão do admin (não service_role).
-- =====================================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.prevent_self_privilege_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  -- Só nos importa alteração de campos sensíveis sobre a PRÓPRIA linha.
  IF auth.uid() IS NOT NULL
     AND auth.uid() = OLD.id
     AND (NEW.role IS DISTINCT FROM OLD.role OR NEW.ativo IS DISTINCT FROM OLD.ativo)
     AND NOT public.has_role(
       ARRAY['administrador','proprietario']::public.role_usuario_enum[]
     ) THEN
    RAISE EXCEPTION 'Alteração do próprio papel/status não é permitida.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.prevent_self_privilege_change() IS
'Bloqueia auto-alteração de role/ativo em usuarios por quem não é administrador/proprietario. '
'Defesa contra escalonamento de privilégio via policy "Self update own profile".';

-- Roda ANTES do trigger de atualizado_em (ordem alfabética garante prioridade:
-- "trg_prevent..." não colide; ambos são BEFORE UPDATE e independentes).
DROP TRIGGER IF EXISTS trg_prevent_self_privilege ON public.usuarios;
CREATE TRIGGER trg_prevent_self_privilege
  BEFORE UPDATE ON public.usuarios
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_self_privilege_change();

-- Função de trigger não deve ser chamável como RPC por roles externos.
REVOKE EXECUTE ON FUNCTION public.prevent_self_privilege_change() FROM PUBLIC, anon, authenticated;

COMMIT;
