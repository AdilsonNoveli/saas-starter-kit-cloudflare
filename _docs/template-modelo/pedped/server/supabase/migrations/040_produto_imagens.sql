-- =====================================================================================
-- MIGRATION: Galeria de imagens do produto (múltiplas fotos)
-- Versão: 040
-- Descrição: Adiciona a coluna `imagens text[]` a produtos para suportar até 5 fotos
--            por produto. `foto_url` permanece como CAPA — retrocompatível: cart,
--            checkout, kits, pedidos e o thumbnail do card continuam lendo a capa.
--            `imagens` guarda apenas as fotos EXTRAS (galeria além da capa), no
--            máximo 4 → total de 5 imagens por produto. A ordem do array é a ordem
--            de exibição. Idempotente (IF NOT EXISTS).
-- =====================================================================================

BEGIN;

ALTER TABLE public.produtos
  ADD COLUMN IF NOT EXISTS imagens text[] NOT NULL DEFAULT '{}';

-- Limite de negócio: no máximo 4 imagens extras (capa em foto_url + 4 = 5 fotos).
-- cardinality() retorna 0 para array vazio (array_length retornaria NULL nesse caso).
ALTER TABLE public.produtos
  DROP CONSTRAINT IF EXISTS produtos_imagens_max_check;
ALTER TABLE public.produtos
  ADD CONSTRAINT produtos_imagens_max_check CHECK (cardinality(imagens) <= 4);

COMMENT ON COLUMN public.produtos.imagens IS 'Fotos EXTRAS do produto (galeria além da capa foto_url). Máx. 4 → total de 5 imagens. A ordem do array é a ordem de exibição.';

COMMIT;
