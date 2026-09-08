-- =====================================================================================
-- MIGRATION: Configuração de colunas do Kanban (metadados de exibição)
-- Versão: 009
-- Fase do Plano: 2.7
-- Descrição: O status canônico continua sendo `status_pedido_enum`. As colunas viram
--            metadados (label/cor/ordem/visibilidade) mapeados 1:1 ao enum.
--            Não permitimos criar status arbitrário (preserva enum/triggers/webhooks).
-- =====================================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.kanban_coluna (
  status status_pedido_enum PRIMARY KEY,
  label text NOT NULL,
  cor text NOT NULL DEFAULT '#6B7280',
  ordem int NOT NULL DEFAULT 0,
  visivel boolean NOT NULL DEFAULT true,
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.kanban_coluna IS
'Metadados de exibição das colunas do Kanban. Mapeamento 1:1 com status_pedido_enum.';
COMMENT ON COLUMN public.kanban_coluna.cor IS 'Cor hex (#RRGGBB) usada como acento da coluna.';

DROP TRIGGER IF EXISTS update_kanban_coluna_modtime ON public.kanban_coluna;
CREATE TRIGGER update_kanban_coluna_modtime
BEFORE UPDATE ON public.kanban_coluna
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed dos 7 status canônicos (idempotente)
INSERT INTO public.kanban_coluna (status, label, cor, ordem, visivel) VALUES
  ('pendente',          'Pendente',           '#9CA3AF', 1, true),
  ('confirmado',        'Confirmado',         '#3B82F6', 2, true),
  ('em_preparo',        'Em Preparo',         '#F59E0B', 3, true),
  ('preparado',         'Preparado',          '#8B5CF6', 4, true),
  ('saiu_para_entrega', 'Saiu para Entrega',  '#06B6D4', 5, true),
  ('entregue',          'Entregue',           '#10B981', 6, true),
  ('cancelado',         'Cancelado',          '#EF4444', 7, true)
ON CONFLICT (status) DO NOTHING;

-- RLS
ALTER TABLE public.kanban_coluna ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff read kanban_coluna" ON public.kanban_coluna;
CREATE POLICY "Staff read kanban_coluna" ON public.kanban_coluna
FOR SELECT USING (public.is_staff());

DROP POLICY IF EXISTS "Manage kanban_coluna (gerente+)" ON public.kanban_coluna;
CREATE POLICY "Manage kanban_coluna (gerente+)" ON public.kanban_coluna
FOR ALL
USING (public.has_role(ARRAY['gerente','administrador','proprietario']::role_usuario_enum[]))
WITH CHECK (public.has_role(ARRAY['gerente','administrador','proprietario']::role_usuario_enum[]));

-- Em particular: o status (PK) não deve ser alterável pela aplicação
-- (mudar PK = quebrar referência ao enum). DROP é evitado pela ausência de policy de DELETE.

COMMIT;
