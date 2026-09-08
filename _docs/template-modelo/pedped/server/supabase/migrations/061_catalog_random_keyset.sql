-- =====================================================================================
-- MIGRATION 061: Catálogo com ordem aleatória ESCALÁVEL (keyset + índice)
-- =====================================================================================
-- Problema: ordenar por `nome` (alfabético) é ruim para o negócio; e a solução
-- ingênua (buscar todos os ids e embaralhar em memória, ou usar OFFSET) NÃO
-- escala para 10k+ produtos — OFFSET faz full scan em páginas profundas e o
-- "fetch all ids" explode egress/memória.
--
-- Solução enterprise:
--   1) Coluna persistente `rank_aleatorio` (random()) + índices → ordem estável
--      e indexável.
--   2) Paginação por KEYSET (cursor (rank, id)) — O(log n) por página, sem OFFSET.
--   3) "Renovar o que aparece primeiro a cada refresh": cada carregamento escolhe
--      um PIVOT aleatório em [0,1); a leitura começa em `rank >= pivot` (segmento
--      A) e, ao esgotar, continua em `rank < pivot` (segmento B) — rotação sobre
--      a permutação, cobrindo 100% do catálogo com ponto de entrada diferente por
--      carregamento. Desempate por `id` (PK única) garante ordem total estrita.
-- =====================================================================================

BEGIN;

-- 1) Coluna de rank aleatório persistente ---------------------------------------
ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS rank_aleatorio double precision;
UPDATE public.produtos SET rank_aleatorio = random() WHERE rank_aleatorio IS NULL;
ALTER TABLE public.produtos ALTER COLUMN rank_aleatorio SET DEFAULT random();
ALTER TABLE public.produtos ALTER COLUMN rank_aleatorio SET NOT NULL;

-- 2) Índices de suporte ao keyset (parciais em disponivel = catálogo público) ----
CREATE INDEX IF NOT EXISTS idx_produtos_rank
  ON public.produtos (rank_aleatorio, id) WHERE disponivel;
CREATE INDEX IF NOT EXISTS idx_produtos_cat_rank
  ON public.produtos (categoria_id, rank_aleatorio, id) WHERE disponivel;
-- EXISTS(tem_opcoes) por linha usa este índice (evita seq scan por produto).
CREATE INDEX IF NOT EXISTS idx_produto_opcao_grupo_produto
  ON public.produto_opcao_grupo (produto_id);

-- 3) RPC de página do catálogo (keyset + rotação por pivot) ----------------------
--    Retorna apenas campos públicos (NUNCA preco_custo/margem_lucro) + tem_opcoes
--    calculado inline (elimina 2ª query) + rank/wrapped p/ o próximo cursor.
CREATE OR REPLACE FUNCTION public.catalog_products_page(
  p_pivot       double precision,
  p_cursor_rank double precision,
  p_cursor_id   uuid,
  p_wrapped     boolean,
  p_limit       integer,
  p_categoria   uuid
)
RETURNS TABLE (
  id                    uuid,
  categoria_id          uuid,
  nome                  text,
  descricao             text,
  foto_url              text,
  imagens               text[],
  preco_venda           numeric,
  preco_promocional     numeric,
  unidade_medida        public.unidade_medida_enum,
  permite_fracionamento boolean,
  estoque_atual         numeric,
  disponivel            boolean,
  criado_em             timestamptz,
  tem_opcoes            boolean,
  rank_aleatorio        double precision,
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
BEGIN
  IF NOT coalesce(p_wrapped, false) THEN
    -- Segmento A: rank >= pivot (após o cursor, quando houver)
    RETURN QUERY
      SELECT p.id, p.categoria_id, p.nome, p.descricao, p.foto_url, p.imagens,
             p.preco_venda, p.preco_promocional, p.unidade_medida,
             p.permite_fracionamento, p.estoque_atual, p.disponivel, p.criado_em,
             EXISTS (SELECT 1 FROM public.produto_opcao_grupo g WHERE g.produto_id = p.id),
             p.rank_aleatorio, false
      FROM public.produtos p
      WHERE p.disponivel
        AND (p_categoria IS NULL OR p.categoria_id = p_categoria)
        AND p.rank_aleatorio >= p_pivot
        AND (p_cursor_rank IS NULL OR (p.rank_aleatorio, p.id) > (p_cursor_rank, p_cursor_id))
      ORDER BY p.rank_aleatorio, p.id
      LIMIT v_lim;

    GET DIAGNOSTICS v_got = ROW_COUNT;
    IF v_got >= v_lim THEN
      RETURN;
    END IF;

    -- Esgotou A → completa a página com o início do Segmento B: rank < pivot.
    RETURN QUERY
      SELECT p.id, p.categoria_id, p.nome, p.descricao, p.foto_url, p.imagens,
             p.preco_venda, p.preco_promocional, p.unidade_medida,
             p.permite_fracionamento, p.estoque_atual, p.disponivel, p.criado_em,
             EXISTS (SELECT 1 FROM public.produto_opcao_grupo g WHERE g.produto_id = p.id),
             p.rank_aleatorio, true
      FROM public.produtos p
      WHERE p.disponivel
        AND (p_categoria IS NULL OR p.categoria_id = p_categoria)
        AND p.rank_aleatorio < p_pivot
      ORDER BY p.rank_aleatorio, p.id
      LIMIT (v_lim - v_got);
  ELSE
    -- Já no Segmento B: rank < pivot (após o cursor)
    RETURN QUERY
      SELECT p.id, p.categoria_id, p.nome, p.descricao, p.foto_url, p.imagens,
             p.preco_venda, p.preco_promocional, p.unidade_medida,
             p.permite_fracionamento, p.estoque_atual, p.disponivel, p.criado_em,
             EXISTS (SELECT 1 FROM public.produto_opcao_grupo g WHERE g.produto_id = p.id),
             p.rank_aleatorio, true
      FROM public.produtos p
      WHERE p.disponivel
        AND (p_categoria IS NULL OR p.categoria_id = p_categoria)
        AND p.rank_aleatorio < p_pivot
        AND (p_cursor_rank IS NULL OR (p.rank_aleatorio, p.id) > (p_cursor_rank, p_cursor_id))
      ORDER BY p.rank_aleatorio, p.id
      LIMIT v_lim;
  END IF;
END;
$$;

COMMENT ON FUNCTION public.catalog_products_page(double precision, double precision, uuid, boolean, integer, uuid) IS
'Página do catálogo em ordem pseudo-aleatória por keyset (rank_aleatorio, id) com rotação por pivot. O(log n) por página, escala para 10k+ sem OFFSET.';

REVOKE EXECUTE ON FUNCTION public.catalog_products_page(double precision, double precision, uuid, boolean, integer, uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.catalog_products_page(double precision, double precision, uuid, boolean, integer, uuid) TO anon, authenticated, service_role;

COMMIT;
