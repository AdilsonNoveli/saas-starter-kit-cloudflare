-- =====================================================================================
-- MIGRATION: Categoria opcional para promoções
-- Versão: 045
-- Descrição: Adiciona `promocoes.categoria_id` opcional (FK → categorias) para
--            classificar campanhas sob o mesmo menu de categorias do catálogo.
--            ON DELETE SET NULL: excluir a categoria não apaga a promoção.
--            Idempotente (IF NOT EXISTS).
-- =====================================================================================

BEGIN;

ALTER TABLE public.promocoes
  ADD COLUMN IF NOT EXISTS categoria_id uuid REFERENCES public.categorias(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.promocoes.categoria_id IS 'Categoria opcional da promoção (NULL = sem categoria).';

COMMIT;
