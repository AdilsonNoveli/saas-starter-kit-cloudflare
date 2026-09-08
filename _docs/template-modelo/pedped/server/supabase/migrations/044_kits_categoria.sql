-- =====================================================================================
-- MIGRATION: Categoria opcional para kits
-- Versão: 044
-- Descrição: Adiciona `kits.categoria_id` opcional (FK → categorias). Kits sem
--            categoria continuam disponíveis apenas na página dedicada /catalog/kits;
--            com categoria, o proprietário pode classificar kits sob o mesmo menu
--            de categorias do catálogo (ex: "Combos", "Promoções").
--            ON DELETE SET NULL: excluir a categoria não apaga o kit.
--            Idempotente (IF NOT EXISTS).
-- =====================================================================================

BEGIN;

ALTER TABLE public.kits
  ADD COLUMN IF NOT EXISTS categoria_id uuid REFERENCES public.categorias(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.kits.categoria_id IS 'Categoria opcional do kit (NULL = sem categoria; aparece só em /catalog/kits).';

COMMIT;
