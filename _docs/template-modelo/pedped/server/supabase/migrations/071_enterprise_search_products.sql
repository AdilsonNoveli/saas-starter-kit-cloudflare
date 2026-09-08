-- =====================================================================================
-- MIGRATION 071: Busca Enterprise de Produtos — Token-AND + word_similarity + Sinônimos
-- =====================================================================================
-- Contexto:
--   1) A busca pg_trgm da migration 070 calculava similarity() sobre a string inteira.
--      Para buscas por múltiplos termos ("pizza queijo"), o similarity ficava abaixo de 0.20
--      e o LIKE exige termos contíguos no mesmo campo.
--   2) No admin, o filtro PostgREST usava sinonimos.cs.{"termo"}, exigindo elemento exato.
--
-- Solução Enterprise:
--   - Token-AND: a busca é dividida em palavras (tokens). CADA TOKEN deve estar no produto
--     (via ILIKE substring ou via word_similarity >= 0.35).
--   - Ranking ponderado por relevância (match exato > similaridade).
--   - RPCs `search_products` (integração n8n) e `search_admin_products` (painel admin).
-- =====================================================================================

BEGIN;

-- ─── 1. RPC DE BUSCA DE PRODUTOS PARA INTEGRAÇÃO (n8n / Agente LLM) ──────────
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
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public, extensions, pg_catalog
AS $$
DECLARE
  v_clean_term text;
  v_tokens     text[];
BEGIN
  -- Normaliza o termo recebido
  v_clean_term := public.f_unaccent(lower(trim(COALESCE(p_term, ''))));

  IF v_clean_term = '' THEN
    RETURN;
  END IF;

  -- Divide em tokens (palavras com 1+ caracteres)
  SELECT array_agg(t) INTO v_tokens
  FROM unnest(regexp_split_to_array(v_clean_term, '\s+')) t
  WHERE length(t) > 0;

  IF v_tokens IS NULL OR array_length(v_tokens, 1) IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH candidato AS (
    SELECT
      p.id,
      p.nome,
      p.descricao,
      p.preco_venda,
      p.preco_promocional,
      p.unidade_medida::text,
      c.nome AS categoria_nome,
      public.f_unaccent(lower(
        p.nome || ' ' ||
        COALESCE(p.descricao, '') || ' ' ||
        COALESCE(c.nome, '') || ' ' ||
        public.f_array_to_string(p.sinonimos)
      )) AS haystack,
      public.f_unaccent(lower(p.nome)) AS nome_clean,
      public.f_array_to_string(p.sinonimos) AS sinonimos_str
    FROM public.produtos p
    LEFT JOIN public.categorias c ON c.id = p.categoria_id
    WHERE p.disponivel = true
  )
  SELECT
    cand.id,
    cand.nome,
    cand.descricao,
    cand.preco_venda,
    cand.preco_promocional,
    cand.unidade_medida,
    cand.categoria_nome
  FROM candidato cand
  WHERE
    -- Token-AND: cada palavra em v_tokens deve dar match no haystack (ou substring ou word_similarity)
    NOT EXISTS (
      SELECT 1
      FROM unnest(v_tokens) tok
      WHERE NOT (
        cand.haystack LIKE '%' || tok || '%'
        OR extensions.word_similarity(tok, cand.haystack) >= 0.35
      )
    )
  ORDER BY
    -- Score de relevância
    (
      CASE
        WHEN cand.nome_clean = v_clean_term THEN 1000
        WHEN cand.sinonimos_str LIKE '%' || v_clean_term || '%' THEN 800
        WHEN cand.nome_clean LIKE '%' || v_clean_term || '%' THEN 600
        WHEN cand.haystack LIKE '%' || v_clean_term || '%' THEN 400
        ELSE 100
      END +
      (extensions.word_similarity(v_clean_term, cand.haystack) * 100)::integer
    ) DESC,
    cand.nome ASC
  LIMIT  GREATEST(1, LEAST(p_lim, 100))
  OFFSET GREATEST(0, p_off);
END;
$$;

COMMENT ON FUNCTION public.search_products(text, integer, integer) IS
'Busca enterprise de produtos por Token-AND + word_similarity. Migration 071.';

REVOKE EXECUTE ON FUNCTION public.search_products(text, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.search_products(text, integer, integer) TO service_role;


-- ─── 2. RPC DE BUSCA DE PRODUTOS PARA PAINEL ADMIN ───────────────────────────
CREATE OR REPLACE FUNCTION public.search_admin_products(
  p_term         text DEFAULT NULL,
  p_categoria_id uuid DEFAULT NULL,
  p_disponivel   boolean DEFAULT NULL,
  p_lim          integer DEFAULT 20,
  p_off          integer DEFAULT 0,
  p_product_type text DEFAULT NULL
)
RETURNS TABLE (
  id                    uuid,
  categoria_id          uuid,
  nome                  text,
  descricao             text,
  foto_url              text,
  imagens               text[],
  preco_custo           numeric,
  margem_lucro          numeric,
  preco_venda           numeric,
  preco_promocional     numeric,
  unidade_medida        text,
  permite_fracionamento boolean,
  estoque_atual         numeric,
  disponivel            boolean,
  criado_em             timestamptz,
  sinonimos             text[],
  product_type          text,
  preorder_config       jsonb,
  categoria_nome        text,
  tem_opcoes            boolean,
  total_count           bigint
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public, extensions, pg_catalog
AS $$
DECLARE
  v_clean_term text;
  v_tokens     text[];
  v_has_term   boolean := false;
BEGIN
  IF p_term IS NOT NULL AND trim(p_term) <> '' THEN
    v_clean_term := public.f_unaccent(lower(trim(p_term)));
    SELECT array_agg(t) INTO v_tokens
    FROM unnest(regexp_split_to_array(v_clean_term, '\s+')) t
    WHERE length(t) > 0;
    
    IF v_tokens IS NOT NULL AND array_length(v_tokens, 1) > 0 THEN
      v_has_term := true;
    END IF;
  END IF;

  RETURN QUERY
  WITH filtrado AS (
    SELECT
      p.id,
      p.categoria_id,
      p.nome,
      p.descricao,
      p.foto_url,
      p.imagens,
      p.preco_custo,
      p.margem_lucro,
      p.preco_venda,
      p.preco_promocional,
      p.unidade_medida::text,
      p.permite_fracionamento,
      p.estoque_atual,
      p.disponivel,
      p.criado_em,
      p.sinonimos,
      p.product_type,
      p.preorder_config::jsonb,
      c.nome AS categoria_nome,
      EXISTS (
        SELECT 1 FROM public.produto_opcao_grupo pog WHERE pog.produto_id = p.id
      ) AS tem_opcoes,
      public.f_unaccent(lower(
        p.nome || ' ' ||
        COALESCE(p.descricao, '') || ' ' ||
        COALESCE(c.nome, '') || ' ' ||
        public.f_array_to_string(p.sinonimos)
      )) AS haystack,
      public.f_unaccent(lower(p.nome)) AS nome_clean,
      public.f_array_to_string(p.sinonimos) AS sinonimos_str
    FROM public.produtos p
    LEFT JOIN public.categorias c ON c.id = p.categoria_id
    WHERE
      (p_categoria_id IS NULL OR p.categoria_id = p_categoria_id)
      AND (p_disponivel IS NULL OR p.disponivel = p_disponivel)
      AND (p_product_type IS NULL OR p.product_type = p_product_type)
      AND (
        NOT v_has_term
        OR NOT EXISTS (
          SELECT 1
          FROM unnest(v_tokens) tok
          WHERE NOT (
            public.f_unaccent(lower(
              p.nome || ' ' ||
              COALESCE(p.descricao, '') || ' ' ||
              COALESCE(c.nome, '') || ' ' ||
              public.f_array_to_string(p.sinonimos)
            )) LIKE '%' || tok || '%'
            OR extensions.word_similarity(tok, public.f_unaccent(lower(
              p.nome || ' ' ||
              COALESCE(p.descricao, '') || ' ' ||
              COALESCE(c.nome, '') || ' ' ||
              public.f_array_to_string(p.sinonimos)
            ))) >= 0.35
          )
        )
      )
  ),
  contado AS (
    SELECT
      f.*,
      COUNT(*) OVER() AS total_count
    FROM filtrado f
  )
  SELECT
    c.id,
    c.categoria_id,
    c.nome,
    c.descricao,
    c.foto_url,
    c.imagens,
    c.preco_custo,
    c.margem_lucro,
    c.preco_venda,
    c.preco_promocional,
    c.unidade_medida,
    c.permite_fracionamento,
    c.estoque_atual,
    c.disponivel,
    c.criado_em,
    c.sinonimos,
    c.product_type,
    c.preorder_config,
    c.categoria_nome,
    c.tem_opcoes,
    c.total_count
  FROM contado c
  ORDER BY
    CASE WHEN v_has_term THEN
      (
        CASE
          WHEN c.nome_clean = v_clean_term THEN 1000
          WHEN c.sinonimos_str LIKE '%' || v_clean_term || '%' THEN 800
          WHEN c.nome_clean LIKE '%' || v_clean_term || '%' THEN 600
          WHEN c.haystack LIKE '%' || v_clean_term || '%' THEN 400
          ELSE 100
        END +
        (extensions.word_similarity(v_clean_term, c.haystack) * 100)::integer
      )
    ELSE 0 END DESC,
    c.criado_em DESC,
    c.nome ASC
  LIMIT  GREATEST(1, LEAST(p_lim, 100))
  OFFSET GREATEST(0, p_off);
END;
$$;

COMMENT ON FUNCTION public.search_admin_products(text, uuid, boolean, integer, integer, text) IS
'Busca enterprise de produtos no admin por Token-AND + word_similarity. Migration 071.';

REVOKE EXECUTE ON FUNCTION public.search_admin_products(text, uuid, boolean, integer, integer, text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.search_admin_products(text, uuid, boolean, integer, integer, text) TO anon, authenticated, service_role;

COMMIT;
