-- =====================================================================================
-- MIGRATION: Defaults corretos em RPCs de catálogo + remoção de overload duplicada
-- Versão: 083
-- =====================================================================================
-- CONTEXTO:
--   A regeneração de database.types.ts (EPIC 1) revelou dois problemas reais
--   de schema, expostos porque os tipos manuais anteriores mascaravam a
--   assinatura verdadeira das RPCs:
--
--   1. `catalog_products_page` declara p_cursor_rank/p_cursor_id/p_categoria/
--      p_limit/p_wrapped como obrigatórios, mas o CORPO da função já trata
--      NULL em todos eles (`p_cursor_rank IS NULL OR ...`, `coalesce(...)`).
--      Sem DEFAULT, o tipo gerado força esses parâmetros como não-nulos,
--      embora a primeira página (sem cursor) sempre os envie como null.
--      Isso é dívida de schema, não uma migração de comportamento.
--
--   2. `search_admin_products` existe em DUAS versões sobrecarregadas: uma de
--      5 parâmetros (migration 070) e outra de 6 (071, com p_product_type).
--      A de 5 é estritamente superada pela de 6 com p_product_type DEFAULT
--      NULL — nenhum consumidor real precisa da versão antiga (grep confirma
--      2 chamadores, ambos compatíveis com a versão de 6). A duplicata
--      também ambiguizava a geração de tipos TypeScript.
--
-- IDEMPOTÊNCIA: CREATE OR REPLACE (mesmo corpo, só com DEFAULT); DROP
--   FUNCTION IF EXISTS para a overload removida.
-- =====================================================================================

BEGIN;

-- 1) catalog_products_page — defaults alinhados ao comportamento real do corpo.
CREATE OR REPLACE FUNCTION public.catalog_products_page(
  p_pivot        double precision,
  p_cursor_rank  double precision DEFAULT NULL,
  p_cursor_id    uuid             DEFAULT NULL,
  p_wrapped      boolean          DEFAULT false,
  p_limit        integer          DEFAULT 24,
  p_categoria    uuid             DEFAULT NULL
)
RETURNS TABLE(
  id uuid, categoria_id uuid, nome text, descricao text, foto_url text, imagens text[],
  preco_venda numeric, preco_promocional numeric, unidade_medida unidade_medida_enum,
  permite_fracionamento boolean, estoque_atual numeric, disponivel boolean,
  criado_em timestamptz, tem_opcoes boolean, product_type text, preorder_config jsonb,
  rank_aleatorio double precision, wrapped boolean
)
LANGUAGE plpgsql
STABLE
SET search_path TO 'public', 'pg_catalog'
AS $$
DECLARE
  v_lim integer := greatest(1, least(coalesce(p_limit, 24), 100));
  v_got integer;
BEGIN
  IF NOT coalesce(p_wrapped, false) THEN
    RETURN QUERY
      SELECT p.id, p.categoria_id, p.nome, p.descricao, p.foto_url, p.imagens,
             p.preco_venda, p.preco_promocional, p.unidade_medida,
             p.permite_fracionamento, p.estoque_atual, p.disponivel, p.criado_em,
             EXISTS (SELECT 1 FROM public.produto_opcao_grupo g WHERE g.produto_id = p.id),
             p.product_type, p.preorder_config,
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

    RETURN QUERY
      SELECT p.id, p.categoria_id, p.nome, p.descricao, p.foto_url, p.imagens,
             p.preco_venda, p.preco_promocional, p.unidade_medida,
             p.permite_fracionamento, p.estoque_atual, p.disponivel, p.criado_em,
             EXISTS (SELECT 1 FROM public.produto_opcao_grupo g WHERE g.produto_id = p.id),
             p.product_type, p.preorder_config,
             p.rank_aleatorio, true
      FROM public.produtos p
      WHERE p.disponivel
        AND (p_categoria IS NULL OR p.categoria_id = p_categoria)
        AND p.rank_aleatorio < p_pivot
      ORDER BY p.rank_aleatorio, p.id
      LIMIT (v_lim - v_got);
  ELSE
    RETURN QUERY
      SELECT p.id, p.categoria_id, p.nome, p.descricao, p.foto_url, p.imagens,
             p.preco_venda, p.preco_promocional, p.unidade_medida,
             p.permite_fracionamento, p.estoque_atual, p.disponivel, p.criado_em,
             EXISTS (SELECT 1 FROM public.produto_opcao_grupo g WHERE g.produto_id = p.id),
             p.product_type, p.preorder_config,
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

-- 2) search_admin_products — remove a overload de 5 parâmetros (superada pela
--    de 6 com p_product_type DEFAULT NULL, mesmo corpo funcional).
DROP FUNCTION IF EXISTS public.search_admin_products(text, uuid, boolean, integer, integer);

COMMIT;

-- =====================================================================================
-- DOWN (rollback manual):
--
-- Recriar search_admin_products(text, uuid, boolean, integer, integer) a partir
-- da migration 070 (corpo sem p_product_type) e reverter catalog_products_page
-- para a assinatura sem DEFAULT (migration 061).
-- =====================================================================================
