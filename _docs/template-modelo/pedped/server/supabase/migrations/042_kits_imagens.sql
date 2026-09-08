-- =====================================================================================
-- MIGRATION: Galeria de imagens do kit (múltiplas fotos)
-- Versão: 042
-- Descrição: Espelha a galeria de produtos (migração 040) na tabela kits.
--            `foto_url` permanece como CAPA (retrocompatível: cart/checkout/cards).
--            `imagens` guarda as fotos EXTRAS (galeria além da capa), no máximo 4 →
--            total de 5 imagens por kit. A ordem do array é a ordem de exibição.
--            Idempotente (IF NOT EXISTS).
-- =====================================================================================

BEGIN;

ALTER TABLE public.kits
  ADD COLUMN IF NOT EXISTS imagens text[] NOT NULL DEFAULT '{}';

ALTER TABLE public.kits
  DROP CONSTRAINT IF EXISTS kits_imagens_max_check;
ALTER TABLE public.kits
  ADD CONSTRAINT kits_imagens_max_check CHECK (cardinality(imagens) <= 4);

COMMENT ON COLUMN public.kits.imagens IS 'Fotos EXTRAS do kit (galeria além da capa foto_url). Máx. 4 → total de 5 imagens. A ordem do array é a ordem de exibição.';

COMMIT;
