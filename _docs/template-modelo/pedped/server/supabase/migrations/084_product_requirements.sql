-- =====================================================================================
-- MIGRATION: produtos.requirements (EPIC 2 — PRD-REFATORACAO)
-- Versão: 084
-- =====================================================================================
-- CONTEXTO:
--   O motor de `missing_fields` (Feature 2.2) precisa saber, POR PRODUTO, o
--   que é obrigatório coletar antes do checkout. Hoje essa decisão é
--   hardcoded via `product_type='preorder'` espalhado pelo código/prompt.
--
--   `requirements` move essa decisão para dado: backfill determinístico a
--   partir de `product_type` (preorder ⇒ requires_date=true). `product_type`
--   é MANTIDO como informacional — EPIC 5 avalia a remoção depois que todo
--   consumidor migrar para `requirements`.
--
-- IDEMPOTÊNCIA: ADD COLUMN IF NOT EXISTS; UPDATE do backfill é inócuo ao
--   repetir (mesmo resultado determinístico a partir de product_type).
-- =====================================================================================

BEGIN;

ALTER TABLE public.produtos
  ADD COLUMN IF NOT EXISTS requirements jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Backfill determinístico: encomenda exige data; venda imediata não exige nada.
UPDATE public.produtos
   SET requirements = '{"requires_date": true}'::jsonb
 WHERE product_type = 'preorder';

UPDATE public.produtos
   SET requirements = '{"requires_date": false}'::jsonb
 WHERE product_type = 'stock';

COMMENT ON COLUMN public.produtos.requirements IS
  'Requisitos declarados pelo produto para o motor de missing_fields (EPIC 2). Schema: ProductRequirements em shared/types/preorder.ts. Backfill: preorder ⇒ requires_date=true.';

COMMIT;

-- =====================================================================================
-- DOWN (rollback manual):
--
-- BEGIN;
-- ALTER TABLE public.produtos DROP COLUMN IF EXISTS requirements;
-- COMMIT;
-- =====================================================================================
