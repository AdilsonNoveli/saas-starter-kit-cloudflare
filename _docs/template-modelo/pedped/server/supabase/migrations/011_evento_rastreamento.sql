-- =====================================================================================
-- MIGRATION: Observabilidade interna (eventos de rastreamento)
-- Versão: 011
-- Fase do Plano: 2.9
-- Descrição:
--   - Tabela `evento_rastreamento` substitui o GA (a remoção do GA é a 3.5).
--   - Reaproveita `sessoes` (jornada do cliente).
--   - Índices por tipo e criado_em (para agregações).
--   - RPCs de agregação para o dashboard (top páginas, cliques por botão, funil).
-- =====================================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.evento_rastreamento (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sessao_id uuid REFERENCES public.sessoes(id) ON DELETE SET NULL,
  tipo text NOT NULL,
  entidade text,
  entidade_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  criado_em timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.evento_rastreamento IS
'Eventos internos de observabilidade (page_view, click, add_to_cart, checkout_iniciado, ...).';
COMMENT ON COLUMN public.evento_rastreamento.tipo IS 'Identificador do evento (snake_case).';

CREATE INDEX IF NOT EXISTS idx_evento_rastreamento_tipo
ON public.evento_rastreamento (tipo, criado_em DESC);

CREATE INDEX IF NOT EXISTS idx_evento_rastreamento_criado
ON public.evento_rastreamento (criado_em DESC);

CREATE INDEX IF NOT EXISTS idx_evento_rastreamento_sessao
ON public.evento_rastreamento (sessao_id) WHERE sessao_id IS NOT NULL;

-- RLS — leitura por staff; ingestão pela API (service role)
ALTER TABLE public.evento_rastreamento ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff read evento_rastreamento" ON public.evento_rastreamento;
CREATE POLICY "Staff read evento_rastreamento" ON public.evento_rastreamento
FOR SELECT USING (public.is_staff());

-- Inserção é feita pelo endpoint /api/track (service role) — sem policy aberta.

-- =====================================================================================
-- RPCs DE AGREGAÇÃO PARA O DASHBOARD
-- =====================================================================================

-- Top páginas (page_view) em uma janela
CREATE OR REPLACE FUNCTION public.get_top_paginas(p_horas int DEFAULT 24, p_limit int DEFAULT 10)
RETURNS TABLE (pagina text, total bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT (metadata->>'pagina') AS pagina, COUNT(*)::bigint AS total
  FROM public.evento_rastreamento
  WHERE tipo = 'page_view'
    AND criado_em >= now() - make_interval(hours => p_horas)
    AND metadata ? 'pagina'
  GROUP BY metadata->>'pagina'
  ORDER BY total DESC
  LIMIT p_limit;
$$;

-- Top cliques por rótulo (botões instrumentados via data-track)
CREATE OR REPLACE FUNCTION public.get_top_cliques(p_horas int DEFAULT 24, p_limit int DEFAULT 10)
RETURNS TABLE (rotulo text, total bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT (metadata->>'rotulo') AS rotulo, COUNT(*)::bigint AS total
  FROM public.evento_rastreamento
  WHERE tipo = 'click'
    AND criado_em >= now() - make_interval(hours => p_horas)
    AND metadata ? 'rotulo'
  GROUP BY metadata->>'rotulo'
  ORDER BY total DESC
  LIMIT p_limit;
$$;

-- Funil de conversão: page_view -> add_to_cart -> checkout_iniciado -> pedido (sessao convertida)
CREATE OR REPLACE FUNCTION public.get_funil_conversao(p_horas int DEFAULT 24)
RETURNS TABLE (etapa text, total bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  WITH base AS (
    SELECT * FROM public.evento_rastreamento
    WHERE criado_em >= now() - make_interval(hours => p_horas)
  )
  SELECT 'page_view'         AS etapa, COUNT(*)::bigint FROM base WHERE tipo = 'page_view'
  UNION ALL
  SELECT 'add_to_cart',      COUNT(*)::bigint FROM base WHERE tipo = 'add_to_cart'
  UNION ALL
  SELECT 'checkout_iniciado', COUNT(*)::bigint FROM base WHERE tipo = 'checkout_iniciado'
  UNION ALL
  SELECT 'pedido', COUNT(*)::bigint
    FROM public.sessoes
    WHERE status = 'convertida'
      AND criado_em >= now() - make_interval(hours => p_horas);
$$;

REVOKE EXECUTE ON FUNCTION public.get_top_paginas(int,int)   FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_top_cliques(int,int)   FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_funil_conversao(int)   FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_top_paginas(int,int)    TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_top_cliques(int,int)    TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_funil_conversao(int)    TO authenticated;

COMMIT;
