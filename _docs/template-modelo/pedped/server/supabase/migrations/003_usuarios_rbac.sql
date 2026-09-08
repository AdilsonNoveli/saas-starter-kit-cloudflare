-- =====================================================================================
-- MIGRATION: Tabela usuarios + RBAC (role_usuario_enum + helpers is_staff/has_role)
-- Versão: 003
-- Fase do Plano: 2.1
-- Descrição: Cria a tabela `usuarios` (perfil + papel), enum de papéis e funções
--            auxiliares de RLS. Substitui o modelo "qualquer autenticado = admin".
-- =====================================================================================

BEGIN;

-- 1) Enum de papéis
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'role_usuario_enum') THEN
    CREATE TYPE role_usuario_enum AS ENUM (
      'entregador',
      'atendente',
      'producao',
      'gerente',
      'administrador',
      'proprietario'
    );
  END IF;
END $$;

-- 2) Tabela usuarios (perfil 1:1 com auth.users)
CREATE TABLE IF NOT EXISTS public.usuarios (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome text,
  avatar_url text,
  whatsapp text,
  role role_usuario_enum NOT NULL DEFAULT 'atendente',
  ativo boolean NOT NULL DEFAULT true,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.usuarios IS
'Perfil + papel (RBAC) dos usuários do sistema. Espelha 1:1 auth.users.';
COMMENT ON COLUMN public.usuarios.id IS 'FK para auth.users.id (CASCADE).';
COMMENT ON COLUMN public.usuarios.role IS 'Papel do usuário (RBAC) usado pelas políticas RLS.';

-- 3) Trigger atualizado_em (reusa função pública existente em supabase-init.sql)
DROP TRIGGER IF EXISTS update_usuarios_modtime ON public.usuarios;
CREATE TRIGGER update_usuarios_modtime
BEFORE UPDATE ON public.usuarios
FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

-- 4) Trigger de bootstrap: cria linha em `usuarios` para todo novo auth.users
--    (evita janela onde o usuário existe em auth mas não em public.usuarios)
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  -- Cria perfil mínimo; demais campos preenchidos no fluxo de convite/perfil.
  INSERT INTO public.usuarios (id, nome, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', NEW.email),
    COALESCE((NEW.raw_user_meta_data->>'role')::role_usuario_enum, 'atendente')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.handle_new_auth_user() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- 5) Helpers de RLS (lookup por auth.uid())

-- Retorna o papel do usuário corrente (ou NULL se não autenticado/sem perfil)
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS role_usuario_enum
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT u.role
  FROM public.usuarios u
  WHERE u.id = auth.uid()
    AND u.ativo = true;
$$;

-- Verdadeiro se o usuário corrente possui qualquer papel de staff (não-entregador)
CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.usuarios u
    WHERE u.id = auth.uid()
      AND u.ativo = true
      AND u.role IN ('atendente', 'producao', 'gerente', 'administrador', 'proprietario')
  );
$$;

-- Verdadeiro se o usuário corrente possui um dos papéis informados
CREATE OR REPLACE FUNCTION public.has_role(roles role_usuario_enum[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.usuarios u
    WHERE u.id = auth.uid()
      AND u.ativo = true
      AND u.role = ANY(roles)
  );
$$;

-- Limita execução das funções (defense-in-depth: usadas só em policies/server)
REVOKE EXECUTE ON FUNCTION public.current_user_role() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_staff() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_role(role_usuario_enum[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_staff() TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(role_usuario_enum[]) TO authenticated;

-- 6) RLS na própria tabela usuarios
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;

-- Cada usuário lê o próprio perfil
DROP POLICY IF EXISTS "Self read own profile" ON public.usuarios;
CREATE POLICY "Self read own profile" ON public.usuarios
FOR SELECT
USING (id = auth.uid());

-- Cada usuário pode atualizar o próprio perfil (campos restritos via app/zod)
DROP POLICY IF EXISTS "Self update own profile" ON public.usuarios;
CREATE POLICY "Self update own profile" ON public.usuarios
FOR UPDATE
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Administradores e proprietários gerenciam todos os usuários
DROP POLICY IF EXISTS "Admins manage usuarios" ON public.usuarios;
CREATE POLICY "Admins manage usuarios" ON public.usuarios
FOR ALL
USING (public.has_role(ARRAY['administrador','proprietario']::role_usuario_enum[]))
WITH CHECK (public.has_role(ARRAY['administrador','proprietario']::role_usuario_enum[]));

-- Staff (gerente+) pode ler todos (necessário para listas/atribuições)
DROP POLICY IF EXISTS "Staff read all usuarios" ON public.usuarios;
CREATE POLICY "Staff read all usuarios" ON public.usuarios
FOR SELECT
USING (public.has_role(ARRAY['gerente','administrador','proprietario']::role_usuario_enum[]));

COMMIT;

-- =====================================================================================
-- SEED MANUAL (PROPRIETÁRIO INICIAL)
-- =====================================================================================
-- Após criar o primeiro auth.user (via dashboard ou seed-auth-user.sql), promova-o:
--
--   UPDATE public.usuarios
--   SET role = 'proprietario', nome = 'Proprietário'
--   WHERE id = '<uuid-do-auth-user>';
--
-- =====================================================================================
