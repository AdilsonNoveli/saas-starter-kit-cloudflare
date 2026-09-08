-- ============================================================
-- Migration 035 — Faturamento por status dinâmico (fim do acoplamento a 'entregue')
--
-- Bug: o dashboard só somava pedidos 'entregue', mesmo trocando a coluna de
-- receita. `get_dashboard_metrics` filtrava o período por `p.entregue_em`, que
-- só é preenchido na transição para 'entregue'. Com qualquer outra coluna de
-- receita o faturamento zerava.
--
-- Fix: datar o faturamento por QUANDO o pedido entrou na coluna de receita
-- atual (via pedido_status_historico), em vez de entregue_em. Generaliza para
-- qualquer status; para 'entregue' o resultado é idêntico ao anterior.
-- COALESCE(..., p.criado_em) cobre pedido criado direto no status (o trigger
-- log_pedido_status_change só dispara em UPDATE, não em INSERT).
--
-- Também remove a view `faturamento_diario` (não usada por nenhum código e com
-- o mesmo acoplamento). Idempotente.
-- ============================================================

BEGIN;

DROP VIEW IF EXISTS public.faturamento_diario;

CREATE OR REPLACE FUNCTION public.get_dashboard_metrics(
  p_date_start date DEFAULT NULL,
  p_date_end   date DEFAULT NULL
)
RETURNS TABLE (
  faturamento    numeric,
  total_pedidos  bigint,
  ticket_medio   numeric,
  taxa_conversao numeric
)
LANGUAGE plpgsql
STABLE
SET search_path TO 'public', 'pg_catalog'
AS $$
DECLARE
  v_hoje          date        := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
  v_start         timestamptz := COALESCE(p_date_start, v_hoje) AT TIME ZONE 'America/Sao_Paulo';
  v_end           timestamptz := (COALESCE(p_date_end, v_hoje) + interval '1 day') AT TIME ZONE 'America/Sao_Paulo';
  v_sessoes_total bigint;
  v_sessoes_conv  bigint;
BEGIN
  SELECT
    COUNT(*) FILTER (WHERE s.criado_em >= v_start AND s.criado_em < v_end),
    COUNT(*) FILTER (WHERE s.criado_em >= v_start AND s.criado_em < v_end AND s.status = 'convertida')
  INTO v_sessoes_total, v_sessoes_conv
  FROM public.sessoes s;

  RETURN QUERY
  SELECT
    COALESCE(SUM(p.valor_total), 0)::numeric,
    COUNT(*)::bigint,
    CASE WHEN COUNT(*) > 0
         THEN COALESCE(SUM(p.valor_total), 0) / COUNT(*)
         ELSE 0 END::numeric,
    CASE WHEN v_sessoes_total > 0
         THEN (v_sessoes_conv::numeric / v_sessoes_total::numeric) * 100
         ELSE 0 END::numeric
  FROM public.pedidos p
  JOIN public.kanban_coluna k
    ON k.chave = p.status AND k.is_revenue_trigger = true
  -- Data do faturamento = quando o pedido entrou na coluna de receita atual.
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
'Métricas de faturamento para [p_date_start, p_date_end] em America/Sao_Paulo. Padrão: dia atual. Soma pedidos cujo status atual tem is_revenue_trigger=true, datados por quando entraram nesse status (via pedido_status_historico). Sem status hardcoded, sem entregue_em.';

COMMIT;
