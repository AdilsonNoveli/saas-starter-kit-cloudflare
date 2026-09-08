-- =====================================================================================
-- MIGRATION 070: Coluna `sinonimos` em produtos — busca híbrida pg_trgm + sinônimos
-- =====================================================================================
-- Contexto:
--   A migration 068 implementou busca fuzzy via pg_trgm (similaridade por trigramas).
--   pg_trgm cobre erros tipográficos (esfirra ≈ esfiha via similarity 0.30).
--   Porém há casos que nenhum algoritmo de similaridade resolve sozinho:
--     • "salgado árabe" → "Esfiha de Carne"  (sinônimo semântico)
--     • "refri"         → "Refrigerante Cola" (abreviação radical: similarity ~0.12)
--     • "x-burguer"     → "X-Burguer Duplo"  (variações grafias regionais)
--
--   Solução: coluna `sinonimos text[]` — o proprietário cadastra variações conhecidas
--   e estas entram diretamente no índice GIN de busca. Abordagem Shopify/Algolia:
--   armazenamento desnormalizado no próprio produto, indexado com GIN.
--
-- Impacto na busca para a LLM (endpoint GET /api/integration/v1/products?q=...):
--   A LLM envia termos coloquiais. Com sinônimos cadastrados, o banco encontra
--   correspondências exatas — mais rápido e preciso que qualquer threshold de similarity.
--   A LLM não precisa saber da existência dos sinônimos; a busca é transparente.
--
-- Pré-requisito: migration 068 deve ter sido aplicada (f_unaccent + extensions).
-- Idempotência: script re-executável.
-- =====================================================================================

BEGIN;

-- ─── 1. COLUNA sinonimos ─────────────────────────────────────────────────────
-- text[]: array de strings — permite múltiplas variações por produto.
-- NOT NULL DEFAULT '{}': campo sempre presente, nenhuma lógica de null handling.
-- Lowercase recomendado na UX — o índice aplica lower() de qualquer forma.
ALTER TABLE public.produtos
  ADD COLUMN IF NOT EXISTS sinonimos text[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN public.produtos.sinonimos IS
'Variações, sinônimos e termos coloquiais do produto. '
'Ex: [''esfirra'', ''esfihra'', ''salgado árabe''] para "Esfiha de Carne". '
'Incluídos no índice GIN de busca — a LLM encontra o produto via qualquer termo. '
'Armazenar em lowercase para consistência (índice normaliza via f_unaccent+lower).';

-- ─── 2. FUNÇÃO HELPER IMMUTABLE f_array_to_string ───────────────────────────
-- Necessária para converter array de texto para string dentro da expressão do índice.
-- PostgreSQL proíbe array_to_string() nativa porque ela é classificada como STABLE,
-- pois depende de NLS/session settings em tipos genéricos. Em text[] ela é 100%
-- invariante, logo podemos criar um wrapper IMMUTABLE.
CREATE OR REPLACE FUNCTION public.f_array_to_string(arr text[])
RETURNS text
LANGUAGE sql
IMMUTABLE
STRICT
PARALLEL SAFE
SET search_path = public, extensions, pg_catalog
AS $$
  SELECT pg_catalog.array_to_string(arr, ' ');
$$;

COMMENT ON FUNCTION public.f_array_to_string(text[]) IS
'Wrapper IMMUTABLE de array_to_string para arrays de texto. '
'Necessário para permitir indexação de arrays de sinônimos (Postgres 42P17).';

GRANT EXECUTE ON FUNCTION public.f_array_to_string(text[]) TO PUBLIC;

-- ─── 3. ÍNDICE GIN ATUALIZADO ─────────────────────────────────────────────────
-- Remove o índice da 068 e recria incluindo os sinônimos via f_array_to_string().
DROP INDEX IF EXISTS public.idx_produtos_trgm_busca;

CREATE INDEX idx_produtos_trgm_busca
  ON public.produtos
  USING gin (
    public.f_unaccent(lower(
      nome || ' ' || COALESCE(descricao, '') || ' ' ||
      public.f_array_to_string(sinonimos)
    ))
    extensions.gin_trgm_ops
  )
  WHERE disponivel;

COMMENT ON INDEX public.idx_produtos_trgm_busca IS
'Índice GIN para busca fuzzy em nome + descrição + sinônimos do produto. '
'Normalizado: f_unaccent(lower(...)). Parcial: disponivel=true. '
'Expressão idêntica à usada em search_products(). Migration 070.';

-- ─── 4. RPC search_products ATUALIZADA ────────────────────────────────────────
-- Substitui a versão da migration 068. A única mudança é a inclusão de
-- f_array_to_string(sinonimos) no campo de busca — idêntico ao índice.
CREATE OR REPLACE FUNCTION public.search_products(
  p_term  text,
  p_lim   integer DEFAULT 20,
  p_off   integer DEFAULT 0
)
RETURNS TABLE (
  id                uuid,
  nome              text,
  descricao         text,
  preco_venda       numeric,
  preco_promocional numeric,
  unidade_medida    text,
  categoria_nome    text
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, extensions, pg_catalog
AS $$
  SELECT
    p.id,
    p.nome,
    p.descricao,
    p.preco_venda,
    p.preco_promocional,
    p.unidade_medida::text,
    c.nome AS categoria_nome
  FROM public.produtos p
  LEFT JOIN public.categorias c ON c.id = p.categoria_id
  WHERE
    p.disponivel = true
    AND (
      -- Camada 1: similaridade por trigramas em nome + descrição + sinônimos.
      -- Expressão IDÊNTICA ao índice — garante index scan.
      similarity(
        public.f_unaccent(lower(
          p.nome || ' ' || COALESCE(p.descricao, '') || ' ' ||
          public.f_array_to_string(p.sinonimos)
        )),
        public.f_unaccent(lower(p_term))
      ) >= 0.20
      OR
      -- Camada 2: substring fallback — termos curtos e acrônimos.
      public.f_unaccent(lower(
        p.nome || ' ' || COALESCE(p.descricao, '') || ' ' ||
        public.f_array_to_string(p.sinonimos)
      )) LIKE '%' || public.f_unaccent(lower(p_term)) || '%'
    )
  ORDER BY
    similarity(
      public.f_unaccent(lower(
        p.nome || ' ' || COALESCE(p.descricao, '') || ' ' ||
        public.f_array_to_string(p.sinonimos)
      )),
      public.f_unaccent(lower(p_term))
    ) DESC,
    p.nome ASC
  LIMIT  GREATEST(1, LEAST(p_lim, 100))
  OFFSET GREATEST(0, p_off);
$$;

COMMENT ON FUNCTION public.search_products(text, integer, integer) IS
'Busca fuzzy de produtos: pg_trgm similarity >= 0.20 + fallback ILIKE. '
'Campo de busca: nome + descrição + sinônimos (f_array_to_string). '
'Expressão idêntica ao idx_produtos_trgm_busca — garante index scan. '
'Sinônimos não são expostos na resposta — transparente para a LLM. '
'SECURITY INVOKER, apenas service_role. Migration 070.';

-- Grants preservados da migration 068
REVOKE EXECUTE ON FUNCTION public.search_products(text, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.search_products(text, integer, integer) TO service_role;

COMMIT;
