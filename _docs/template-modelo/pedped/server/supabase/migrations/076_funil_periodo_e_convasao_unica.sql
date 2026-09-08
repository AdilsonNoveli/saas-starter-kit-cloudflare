-- ============================================================
-- Migration 076 — Funil de conversão alinhado ao período + métrica única
--
-- Contexto (bug de dashboard): o Funil de Conversão e o card de Faturamento
--   exibiam "conversões" que NUNCA batiam, pois mediam populações e janelas
--   diferentes:
--     • card: taxa_conversao = sessões convertidas / total de sessões (fluxo
--       WhatsApp-bot), no PERÍODO selecionado;
--     • funil: page_view/add_to_cart/checkout (eventos web anônimos) + etapa
--       final = sessões convertidas, tudo numa janela FIXA de 24h.
--
-- Decisão (padrão GA4/Shopify): o funil passa a respeitar o PERÍODO do
--   dashboard e sua etapa final = PEDIDOS REAIS (a mesma base de
--   get_dashboard_metrics.total_pedidos, reaproveitada no frontend — DRY, sem
--   duplicar a regra de datação no banco). A conversão geral (visitas→pedidos)
--   vira a ÚNICA taxa exibida, idêntica nos dois cards. Com isso, a taxa de
--   conversão por sessão (redundante e confusa) é removida do metrics.
--
-- Mudanças:
--   1. get_dashboard_metrics: remove a coluna taxa_conversao (e a contagem de
--      sessões que a alimentava). Assinatura de retorno muda → DROP + CREATE.
--   2. get_funil_conversao: passa de (p_horas int) para (p_date_start,
--      p_date_end date), retornando SÓ as 3 etapas de evento web no período
--      (a etapa 'pedido' é anexada no frontend a partir de total_pedidos).
--
-- Idempotente. Reaplica REVOKE/GRANT após o DROP.
-- ============================================================

BEGIN;

-- ── 1. get_dashboard_metrics sem taxa_conversao ──────────────────────────────
DROP FUNCTION IF EXISTS public.get_dashboard_metrics(date, date);

CREATE FUNCTION public.get_dashboard_metrics(
  p_date_start date DEFAULT NULL,
  p_date_end   date DEFAULT NULL
)
RETURNS TABLE (
  faturamento    numeric,
  total_pedidos  bigint,
  ticket_medio   numeric
)
LANGUAGE plpgsql
STABLE
SET search_path TO 'public', 'pg_catalog'
AS $$
DECLARE
  v_hoje  date        := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
  v_start timestamptz := COALESCE(p_date_start, v_hoje) AT TIME ZONE 'America/Sao_Paulo';
  v_end   timestamptz := (COALESCE(p_date_end, v_hoje) + interval '1 day') AT TIME ZONE 'America/Sao_Paulo';
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(p.valor_total), 0)::numeric,
    COUNT(*)::bigint,
    CASE WHEN COUNT(*) > 0
         THEN COALESCE(SUM(p.valor_total), 0) / COUNT(*)
         ELSE 0 END::numeric
  FROM public.pedidos p
  JOIN public.kanban_coluna k
    ON k.chave = p.status AND k.is_revenue_trigger = true
  -- Data do faturamento = quando o pedido ENTROU na coluna de receita atual.
  CROSS JOIN LATERAL (
    SELECT COALESCE(max(h.criado_em), p.criado_em) AS entrou_em
    FROM public.pedido_status_historico h
    WHERE h.pedido_id = p.id
      AND h.status_novo = p.status
  ) e
  WHERE e.entrou_em >= v_start
    AND e.entrou_em  < v_end;
END;
$$;

COMMENT ON FUNCTION public.get_dashboard_metrics(date, date) IS
'Faturamento, nº de pedidos e ticket médio para [p_date_start, p_date_end] em America/Sao_Paulo. Soma pedidos cujo status atual tem is_revenue_trigger=true, datados por quando entraram nesse status. Conversão saiu daqui: agora é derivada do funil (visitas→pedidos).';

REVOKE EXECUTE ON FUNCTION public.get_dashboard_metrics(date, date) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.get_dashboard_metrics(date, date) TO authenticated, service_role;

-- ── 2. get_funil_conversao por período (só etapas de evento) ─────────────────
DROP FUNCTION IF EXISTS public.get_funil_conversao(int);

CREATE FUNCTION public.get_funil_conversao(
  p_date_start date DEFAULT NULL,
  p_date_end   date DEFAULT NULL
)
RETURNS TABLE (etapa text, total bigint)
LANGUAGE sql
STABLE
SET search_path TO 'public', 'pg_catalog'
AS $$
  WITH bounds AS (
    SELECT
      COALESCE(p_date_start, (now() AT TIME ZONE 'America/Sao_Paulo')::date)
        AT TIME ZONE 'America/Sao_Paulo' AS v_start,
      (COALESCE(p_date_end, (now() AT TIME ZONE 'America/Sao_Paulo')::date) + interval '1 day')
        AT TIME ZONE 'America/Sao_Paulo' AS v_end
  ),
  ev AS (
    SELECT e.tipo
    FROM public.evento_rastreamento e, bounds b
    WHERE e.criado_em >= b.v_start AND e.criado_em < b.v_end
      AND e.tipo IN ('page_view', 'add_to_cart', 'checkout_iniciado')
  )
  -- 3 etapas de evento web (catálogo), na ordem do funil. A etapa final
  -- 'pedido' NÃO vem daqui: o frontend a anexa a partir de
  -- get_dashboard_metrics.total_pedidos (mesma base do faturamento — DRY).
  SELECT etapa, total FROM (
    SELECT 1 AS ord, 'page_view'::text        AS etapa, COUNT(*) FILTER (WHERE tipo = 'page_view')::bigint        AS total FROM ev
    UNION ALL
    SELECT 2,        'add_to_cart',                     COUNT(*) FILTER (WHERE tipo = 'add_to_cart')::bigint               FROM ev
    UNION ALL
    SELECT 3,        'checkout_iniciado',               COUNT(*) FILTER (WHERE tipo = 'checkout_iniciado')::bigint         FROM ev
  ) s
  ORDER BY ord;
$$;

COMMENT ON FUNCTION public.get_funil_conversao(date, date) IS
'Etapas web do funil (page_view → add_to_cart → checkout_iniciado) para o período em America/Sao_Paulo. A etapa final de pedidos reais é anexada no frontend via total_pedidos, garantindo reconciliação com o faturamento.';

REVOKE EXECUTE ON FUNCTION public.get_funil_conversao(date, date) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.get_funil_conversao(date, date) TO authenticated, service_role;

COMMIT;
