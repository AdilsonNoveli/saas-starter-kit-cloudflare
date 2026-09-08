-- =====================================================================================
-- Migration 024: RPCs de observabilidade — Top Categorias e Top Produtos clicados
-- Substitui get_top_paginas (poucas páginas, sem valor) e get_top_cliques (rótulos
-- genéricos de data-track) por agregações com semântica real de produto/categoria.
-- =====================================================================================

-- ── get_top_categorias ────────────────────────────────────────────────────────
-- Agrega eventos 'categoria_view' por nome de categoria (metadata->>'nome').
-- Emitido em catalog/index.vue sempre que o usuário troca de aba de categoria.
DROP FUNCTION IF EXISTS public.get_top_categorias(int, int);
CREATE OR REPLACE FUNCTION public.get_top_categorias(p_horas int DEFAULT 24, p_limit int DEFAULT 10)
RETURNS TABLE (categoria_nome text, total bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT (metadata->>'nome') AS categoria_nome, COUNT(*)::bigint AS total
  FROM public.evento_rastreamento
  WHERE tipo = 'categoria_view'
    AND criado_em >= now() - make_interval(hours => p_horas)
    AND metadata ? 'nome'
  GROUP BY metadata->>'nome'
  ORDER BY total DESC
  LIMIT p_limit;
$$;

-- ── get_top_produtos_click ─────────────────────────────────────────────────────
-- Agrega eventos 'produto_click' por entidade_id, faz join com produto para o nome.
-- Emitido em ProductCard.vue e catalog/index.vue ao abrir detalhes/imagem do produto.
DROP FUNCTION IF EXISTS public.get_top_produtos_click(int, int);
CREATE OR REPLACE FUNCTION public.get_top_produtos_click(p_horas int DEFAULT 24, p_limit int DEFAULT 10)
RETURNS TABLE (produto_id uuid, nome text, total bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT
    e.entidade_id                    AS produto_id,
    COALESCE(p.nome, 'Produto removido') AS nome,
    COUNT(*)::bigint                 AS total
  FROM public.evento_rastreamento e
  LEFT JOIN public.produtos p ON p.id = e.entidade_id
  WHERE e.tipo = 'produto_click'
    AND e.entidade = 'produto'
    AND e.entidade_id IS NOT NULL
    AND e.criado_em >= now() - make_interval(hours => p_horas)
  GROUP BY e.entidade_id, p.nome
  ORDER BY total DESC
  LIMIT p_limit;
$$;

-- ── Permissões ────────────────────────────────────────────────────────────────
REVOKE EXECUTE ON FUNCTION public.get_top_categorias(int, int)      FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_top_produtos_click(int, int)  FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.get_top_categorias(int, int)       TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_top_produtos_click(int, int)   TO authenticated;

COMMENT ON FUNCTION public.get_top_categorias(int, int) IS
  'Top categorias navegadas no catálogo nas últimas N horas, via eventos categoria_view.';
COMMENT ON FUNCTION public.get_top_produtos_click(int, int) IS
  'Top produtos mais visualizados/clicados nas últimas N horas, via eventos produto_click.';
