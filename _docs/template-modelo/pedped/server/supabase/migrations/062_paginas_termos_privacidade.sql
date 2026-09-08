-- Migration: Criação da tabela paginas e seeds de Termos de Uso e Política de Privacidade

CREATE TABLE IF NOT EXISTS public.paginas (
  slug          text        PRIMARY KEY,
  titulo        text        NOT NULL,
  conteudo      text        NOT NULL,
  criado_em     timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.paginas ENABLE ROW LEVEL SECURITY;

-- Política de leitura pública (qualquer um pode ler as páginas)
DROP POLICY IF EXISTS "Public read available pages" ON public.paginas;
CREATE POLICY "Public read available pages" ON public.paginas
  FOR SELECT TO public USING (true);

-- Política de gerenciamento (gerente, administrador, proprietario podem criar, atualizar, deletar)
DROP POLICY IF EXISTS "Manage paginas (gerente+)" ON public.paginas;
CREATE POLICY "Manage paginas (gerente+)" ON public.paginas
  FOR ALL TO public
  USING (private.has_role(ARRAY['gerente'::public.role_usuario_enum, 'administrador'::public.role_usuario_enum, 'proprietario'::public.role_usuario_enum]))
  WITH CHECK (private.has_role(ARRAY['gerente'::public.role_usuario_enum, 'administrador'::public.role_usuario_enum, 'proprietario'::public.role_usuario_enum]));

-- Trigger auto update_updated_at_column
DROP TRIGGER IF EXISTS update_paginas_updated_at ON public.paginas;
CREATE TRIGGER update_paginas_updated_at
  BEFORE UPDATE ON public.paginas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Seeds iniciais
INSERT INTO public.paginas (slug, titulo, conteudo)
VALUES 
  ('termos', 'Termos de Uso', 'Conteúdo padrão dos Termos de Uso. Edite no painel administrativo.'),
  ('privacidade', 'Política de Privacidade', 'Conteúdo padrão da Política de Privacidade. Edite no painel administrativo.')
ON CONFLICT (slug) DO NOTHING;
