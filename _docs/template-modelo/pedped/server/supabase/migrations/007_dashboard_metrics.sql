-- =====================================================================================
-- MIGRATION: VIEW + RPC de métricas do dashboard
-- Versão: 007
-- Fase do Plano: 2.5
-- Descrição: Em vez de criar uma tabela redundante de "faturamento_dia" (KISS/DRY),
--            expomos uma RPC `get_dashboard_metrics()` que agrega em tempo real:
--              - faturamento_dia      (soma valor_total dos pedidos entregues hoje)
--              - total_entregues      (contagem de pedidos entregues hoje)
--              - ticket_medio         (média)
--              - taxa_conversao       (sessoes convertidas / sessoes totais nas últimas 24h)
--            Pré-requisito: 006 (entregue_em).
-- =====================================================================================

BEGIN;

-- VIEW agregada por dia (útil para gráficos históricos)
CREATE OR REPLACE VIEW public.faturamento_diario AS
SELECT
  (entregue_em AT TIME ZONE 'America/Sao_Paulo')::date AS dia,
  COUNT(*)::bigint                                       AS total_entregues,
  COALESCE(SUM(valor_total), 0)::numeric                 AS faturamento,
  CASE WHEN COUNT(*) > 0
       THEN COALESCE(SUM(valor_total), 0) / COUNT(*)
       ELSE 0 END::numeric                               AS ticket_medio
FROM public.pedidos
WHERE status = 'entregue' AND entregue_em IS NOT NULL
GROUP BY 1;

COMMENT ON VIEW public.faturamento_diario IS
'Agregado diário de pedidos entregues (timezone America/Sao_Paulo).';

-- RPC tipada — retorno único do dashboard
CREATE OR REPLACE FUNCTION public.get_dashboard_metrics()
RETURNS TABLE (
  faturamento_dia numeric,
  total_entregues bigint,
  ticket_medio    numeric,
  taxa_conversao  numeric
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_hoje date := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
  v_sessoes_total  bigint;
  v_sessoes_conv   bigint;
BEGIN
  -- Conversão das últimas 24h (sessoes -> pedidos)
  SELECT
    COUNT(*) FILTER (WHERE s.criado_em >= now() - interval '24 hours'),
    COUNT(*) FILTER (WHERE s.criado_em >= now() - interval '24 hours' AND s.status = 'convertida')
  INTO v_sessoes_total, v_sessoes_conv
  FROM public.sessoes s;

  RETURN QUERY
  SELECT
    COALESCE(SUM(p.valor_total), 0)::numeric                          AS faturamento_dia,
    COUNT(*)::bigint                                                  AS total_entregues,
    CASE WHEN COUNT(*) > 0
         THEN COALESCE(SUM(p.valor_total), 0) / COUNT(*)
         ELSE 0 END::numeric                                          AS ticket_medio,
    CASE WHEN v_sessoes_total > 0
         THEN (v_sessoes_conv::numeric / v_sessoes_total::numeric) * 100
         ELSE 0 END::numeric                                          AS taxa_conversao
  FROM public.pedidos p
  WHERE p.status = 'entregue'
    AND p.entregue_em IS NOT NULL
    AND (p.entregue_em AT TIME ZONE 'America/Sao_Paulo')::date = v_hoje;
END;
$$;

COMMENT ON FUNCTION public.get_dashboard_metrics() IS
'Métricas do dashboard do dia atual (timezone America/Sao_Paulo). Lida via supabase.rpc.';

-- Restrição: só usuários staff (autenticados com papel) executam
REVOKE EXECUTE ON FUNCTION public.get_dashboard_metrics() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_dashboard_metrics() TO authenticated;

COMMIT;
