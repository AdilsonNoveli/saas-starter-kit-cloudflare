-- Migration 128: numeração manual de produtos + ordem numérica por categoria.
-- Idempotente: seguro rodar este arquivo mais de uma vez, mesmo que uma
-- execução anterior tenha parado no meio (todo ADD COLUMN/CONSTRAINT usa
-- IF NOT EXISTS ou DROP...IF EXISTS antes de recriar).

-- products.number: identificador numérico manual, opcional, único por categoria.
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS number integer NULL;

ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS products_number_range_check;
ALTER TABLE public.products
  ADD CONSTRAINT products_number_range_check CHECK (number IS NULL OR number BETWEEN 1 AND 999999);

ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS products_category_number_unique;
ALTER TABLE public.products
  ADD CONSTRAINT products_category_number_unique UNIQUE (category_id, number);

COMMENT ON COLUMN public.products.number IS
'Número manual de exibição no catálogo (migration 128) — opcional, único por category_id (NULL não colide). Alimenta a tag quadrada do card do catálogo e a ordenação quando categories.sort_mode = ''numeric''.';

-- categories.sort_mode: 'random' (padrão, comportamento atual) | 'numeric'.
ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS sort_mode text NOT NULL DEFAULT 'random';

ALTER TABLE public.categories
  DROP CONSTRAINT IF EXISTS categories_sort_mode_check;
ALTER TABLE public.categories
  ADD CONSTRAINT categories_sort_mode_check CHECK (sort_mode IN ('random', 'numeric'));

COMMENT ON COLUMN public.categories.sort_mode IS
'Ordem de exibição dos produtos desta categoria no catálogo (migration 128): ''random'' (pseudo-aleatório via products.random_rank, padrão) ou ''numeric'' (via products.number, NULLS LAST). Quando a categoria é a Principal (is_primary), este valor também governa a aba "Todos".';

-- Índices de suporte à paginação por keyset em modo numérico (mesmo padrão de
-- idx_products_rank / idx_products_cat_rank, já existentes para random_rank).
CREATE INDEX IF NOT EXISTS idx_products_number
  ON public.products (number, id) WHERE available;
CREATE INDEX IF NOT EXISTS idx_products_cat_number
  ON public.products (category_id, number, id) WHERE available;

-- ─────────────────────────────────────────────────────────────────────────
-- RPC catalog_products_page: adiciona modo 'numeric' (por categories.sort_mode)
-- mantendo o modo 'random' (pivot + wraparound) bit-a-bit idêntico ao anterior.
-- Assinatura muda (novo parâmetro p_cursor_number) ⇒ precisa DROP antes do
-- CREATE (Postgres não troca a lista de colunas de retorno via OR REPLACE).
-- ─────────────────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.catalog_products_page(double precision, double precision, uuid, boolean, integer, uuid);

CREATE OR REPLACE FUNCTION public.catalog_products_page(
  p_pivot         double precision,
  p_cursor_rank   double precision DEFAULT NULL,
  p_cursor_id     uuid             DEFAULT NULL,
  p_wrapped       boolean          DEFAULT false,
  p_limit         integer          DEFAULT 24,
  p_category     uuid             DEFAULT NULL,
  p_cursor_number integer          DEFAULT NULL
)
RETURNS TABLE (
  id                    uuid,
  category_id          uuid,
  name                  text,
  description             text,
  photo_url              text,
  images               text[],
  sale_price           numeric,
  promo_price     numeric,
  unit        public.unit_enum,
  allows_fractional_sale boolean,
  current_stock         numeric,
  available            boolean,
  created_at             timestamptz,
  tem_opcoes            boolean,
  product_type          text,
  preorder_config       jsonb,
  number                integer,
  sort_mode             text,
  random_rank        double precision,
  wrapped               boolean
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_lim integer := greatest(1, least(coalesce(p_limit, 24), 100));
  v_got integer;
  v_mode text;
  v_null_sentinel constant integer := 1000000;
BEGIN
  -- Resolve o modo de ordenação efetivo (migration 128): pela categoria pedida,
  -- ou pela categoria Principal quando p_category é NULL (aba "Todos" — mesma
  -- categoria que hoje unifica todos os itens da loja, is_primary). RLS de
  -- "Public read available categories" já filtra categorias inativas; se a
  -- leitura não encontrar nada, cai no fallback 'random' (comportamento atual).
  IF p_category IS NULL THEN
    SELECT c.sort_mode INTO v_mode FROM public.categories c WHERE c.is_primary LIMIT 1;
  ELSE
    SELECT c.sort_mode INTO v_mode FROM public.categories c WHERE c.id = p_category;
  END IF;
  v_mode := coalesce(v_mode, 'random');

  IF v_mode = 'numeric' THEN
    -- Ordem determinística por products.number (NULLS LAST via sentinel maior
    -- que o teto do CHECK products_number_range_check) + id como desempate.
    -- Lista fixa, não "gira" como o modo aleatório — keyset simples basta.
    RETURN QUERY
      SELECT p.id, p.category_id, p.name, p.description, p.photo_url, p.images,
             p.sale_price, p.promo_price, p.unit,
             p.allows_fractional_sale, p.current_stock, p.available, p.created_at,
             EXISTS (SELECT 1 FROM public.product_option_group g WHERE g.product_id = p.id),
             p.product_type, p.preorder_config,
             p.number, 'numeric'::text, p.random_rank, false
      FROM public.products p
      WHERE p.available
        AND (p_category IS NULL OR p.category_id = p_category)
        AND (
          p_cursor_id IS NULL
          OR (coalesce(p.number, v_null_sentinel), p.id) > (coalesce(p_cursor_number, v_null_sentinel), p_cursor_id)
        )
      ORDER BY coalesce(p.number, v_null_sentinel), p.id
      LIMIT v_lim;
    RETURN;
  END IF;

  -- Modo 'random' (default) — lógica original INALTERADA; só acrescenta
  -- p.number e o literal 'random'::text às colunas retornadas.
  IF NOT coalesce(p_wrapped, false) THEN
    RETURN QUERY
      SELECT p.id, p.category_id, p.name, p.description, p.photo_url, p.images,
             p.sale_price, p.promo_price, p.unit,
             p.allows_fractional_sale, p.current_stock, p.available, p.created_at,
             EXISTS (SELECT 1 FROM public.product_option_group g WHERE g.product_id = p.id),
             p.product_type, p.preorder_config,
             p.number, 'random'::text, p.random_rank, false
      FROM public.products p
      WHERE p.available
        AND (p_category IS NULL OR p.category_id = p_category)
        AND p.random_rank >= p_pivot
        AND (p_cursor_rank IS NULL OR (p.random_rank, p.id) > (p_cursor_rank, p_cursor_id))
      ORDER BY p.random_rank, p.id
      LIMIT v_lim;

    GET DIAGNOSTICS v_got = ROW_COUNT;
    IF v_got >= v_lim THEN
      RETURN;
    END IF;

    RETURN QUERY
      SELECT p.id, p.category_id, p.name, p.description, p.photo_url, p.images,
             p.sale_price, p.promo_price, p.unit,
             p.allows_fractional_sale, p.current_stock, p.available, p.created_at,
             EXISTS (SELECT 1 FROM public.product_option_group g WHERE g.product_id = p.id),
             p.product_type, p.preorder_config,
             p.number, 'random'::text, p.random_rank, true
      FROM public.products p
      WHERE p.available
        AND (p_category IS NULL OR p.category_id = p_category)
        AND p.random_rank < p_pivot
      ORDER BY p.random_rank, p.id
      LIMIT (v_lim - v_got);
  ELSE
    RETURN QUERY
      SELECT p.id, p.category_id, p.name, p.description, p.photo_url, p.images,
             p.sale_price, p.promo_price, p.unit,
             p.allows_fractional_sale, p.current_stock, p.available, p.created_at,
             EXISTS (SELECT 1 FROM public.product_option_group g WHERE g.product_id = p.id),
             p.product_type, p.preorder_config,
             p.number, 'random'::text, p.random_rank, true
      FROM public.products p
      WHERE p.available
        AND (p_category IS NULL OR p.category_id = p_category)
        AND p.random_rank < p_pivot
        AND (p_cursor_rank IS NULL OR (p.random_rank, p.id) > (p_cursor_rank, p_cursor_id))
      ORDER BY p.random_rank, p.id
      LIMIT v_lim;
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.catalog_products_page(double precision, double precision, uuid, boolean, integer, uuid, integer) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.catalog_products_page(double precision, double precision, uuid, boolean, integer, uuid, integer) TO anon, authenticated, service_role;

-- ─────────────────────────────────────────────────────────────────────────
-- RPC search_admin_products: acrescenta products.number à saída (paridade com
-- AdminProductListItem.numero). Assinatura de parâmetros inalterada, mas o
-- shape de retorno muda ⇒ precisa DROP antes do CREATE.
-- ─────────────────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.search_admin_products(text, uuid, boolean, integer, integer, text);

CREATE OR REPLACE FUNCTION public.search_admin_products(
  p_term text DEFAULT NULL, p_category_id uuid DEFAULT NULL, p_available boolean DEFAULT NULL,
  p_lim integer DEFAULT 20, p_off integer DEFAULT 0, p_product_type text DEFAULT NULL
)
RETURNS TABLE(
  id uuid, category_id uuid, name text, description text, photo_url text, images text[],
  cost_price numeric, profit_margin numeric, sale_price numeric, promo_price numeric,
  unit text, allows_fractional_sale boolean, current_stock numeric, available boolean,
  created_at timestamptz, synonyms text[], product_type text, preorder_config jsonb,
  number integer,
  categoria_nome text, tem_opcoes boolean, total_count bigint
)
LANGUAGE plpgsql
STABLE
SET search_path TO 'public', 'extensions', 'pg_catalog'
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
      p.id, p.category_id, p.name, p.description, p.photo_url, p.images,
      p.cost_price, p.profit_margin, p.sale_price, p.promo_price,
      p.unit::text, p.allows_fractional_sale, p.current_stock, p.available,
      p.created_at, p.synonyms, p.product_type, p.preorder_config::jsonb,
      p.number,
      c.name AS categoria_nome,
      EXISTS (
        SELECT 1 FROM public.product_option_group pog WHERE pog.product_id = p.id
      ) AS tem_opcoes,
      public.f_unaccent(lower(
        p.name || ' ' ||
        COALESCE(p.description, '') || ' ' ||
        COALESCE(c.name, '') || ' ' ||
        public.f_array_to_string(p.synonyms)
      )) AS haystack,
      public.f_unaccent(lower(p.name)) AS nome_clean,
      public.f_array_to_string(p.synonyms) AS sinonimos_str
    FROM public.products p
    LEFT JOIN public.categories c ON c.id = p.category_id
    WHERE
      (p_category_id IS NULL OR p.category_id = p_category_id)
      AND (p_available IS NULL OR p.available = p_available)
      AND (
        p_product_type IS NULL OR
        p.product_type = p_product_type OR
        (p_product_type = 'preorder' AND p.product_type = 'both') OR
        (p_product_type = 'stock' AND p.product_type = 'both')
      )
      AND (
        NOT v_has_term
        OR NOT EXISTS (
          SELECT 1
          FROM unnest(v_tokens) tok
          WHERE NOT (
            public.f_unaccent(lower(
              p.name || ' ' ||
              COALESCE(p.description, '') || ' ' ||
              COALESCE(c.name, '') || ' ' ||
              public.f_array_to_string(p.synonyms)
            )) LIKE '%' || tok || '%'
            OR extensions.word_similarity(tok, public.f_unaccent(lower(
              p.name || ' ' ||
              COALESCE(p.description, '') || ' ' ||
              COALESCE(c.name, '') || ' ' ||
              public.f_array_to_string(p.synonyms)
            ))) >= 0.35
          )
        )
      )
  ),
  contado AS (
    SELECT f.*, COUNT(*) OVER() AS total_count
    FROM filtrado f
  )
  SELECT
    c.id, c.category_id, c.name, c.description, c.photo_url, c.images,
    c.cost_price, c.profit_margin, c.sale_price, c.promo_price,
    c.unit, c.allows_fractional_sale, c.current_stock, c.available,
    c.created_at, c.synonyms, c.product_type, c.preorder_config,
    c.number,
    c.categoria_nome, c.tem_opcoes, c.total_count
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
    c.created_at DESC,
    c.name ASC
  LIMIT  GREATEST(1, LEAST(p_lim, 100))
  OFFSET GREATEST(0, p_off);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.search_admin_products(text, uuid, boolean, integer, integer, text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.search_admin_products(text, uuid, boolean, integer, integer, text) TO anon, authenticated, service_role;
