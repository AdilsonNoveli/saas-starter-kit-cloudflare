-- =====================================================================================
-- MIGRATION: Flags semânticas no kanban + RPCs de dashboard parametrizadas
-- Versão: 022
-- Problema: get_dashboard_metrics() hardcodava status = 'entregue'; loadCounts()
--   no cliente hardcodava 'cancelado' e ['pendente','confirmado']. Qualquer rename
--   de coluna no kanban quebrava o faturamento silenciosamente.
-- Solução: Flags booleanas em kanban_coluna (is_revenue_trigger, is_cancelled,
--   is_open) substituem as strings literais em todo o pipeline. As RPCs passam a
--   aceitar um intervalo de datas (DATE, convertido para timestamptz no servidor
--   em America/Sao_Paulo) — remove todayBounds() client-side com UTC errado.
-- =====================================================================================

BEGIN;

-- ─── 1. Flags semânticas em kanban_coluna ────────────────────────────────────
ALTER TABLE public.kanban_coluna
  ADD COLUMN IF NOT EXISTS is_revenue_trigger boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_cancelled       boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_open            boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.kanban_coluna.is_revenue_trigger IS
  'Pedidos neste status contam no faturamento. Substitui WHERE status = ''entregue'' hardcoded.';
COMMENT ON COLUMN public.kanban_coluna.is_cancelled IS
  'Pedidos neste status são considerados cancelados nos contadores do dashboard.';
COMMENT ON COLUMN public.kanban_coluna.is_open IS
  'Pedidos neste status aguardam ação do operador (ex.: pendente, confirmado).';

-- Seed dos 7 status canônicos — idempotente via ON CONFLICT mais seguro
UPDATE public.kanban_coluna SET is_revenue_trigger = true  WHERE chave = 'entregue';
UPDATE public.kanban_coluna SET is_cancelled       = true  WHERE chave = 'cancelado';
UPDATE public.kanban_coluna SET is_open            = true  WHERE chave IN ('pendente', 'confirmado');

-- ─── 2. Atualiza faturamento_diario — usa flag em vez de literal ─────────────
DROP VIEW IF EXISTS public.faturamento_diario;
CREATE VIEW public.faturamento_diario AS
SELECT
  (p.entregue_em AT TIME ZONE 'America/Sao_Paulo')::date AS dia,
  COUNT(*)::bigint                                        AS total_pedidos,
  COALESCE(SUM(p.valor_total), 0)::numeric               AS faturamento,
  CASE WHEN COUNT(*) > 0
       THEN COALESCE(SUM(p.valor_total), 0) / COUNT(*)
       ELSE 0 END::numeric                               AS ticket_medio
FROM public.pedidos p
JOIN public.kanban_coluna k ON k.chave = p.status
WHERE k.is_revenue_trigger = true
  AND p.entregue_em IS NOT NULL
GROUP BY 1
ORDER BY 1 DESC;

COMMENT ON VIEW public.faturamento_diario IS
'Agregado diário de pedidos com is_revenue_trigger=true. Não hardcoda status.';

-- ─── 3. Remove versão sem parâmetros de get_dashboard_metrics ────────────────
-- Necessário: Postgres trata funções com assinaturas diferentes como overloads
-- distintos. Mantê-la criaria ambiguidade e deixaria código morto com literal.
DROP FUNCTION IF EXISTS public.get_dashboard_metrics();

-- ─── 4. get_dashboard_metrics(date, date) — parametrizado + flag-based ───────
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
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_hoje  date        := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
  v_start timestamptz := COALESCE(p_date_start, v_hoje) AT TIME ZONE 'America/Sao_Paulo';
  v_end   timestamptz := (COALESCE(p_date_end, v_hoje) + interval '1 day') AT TIME ZONE 'America/Sao_Paulo';
  v_sessoes_total bigint;
  v_sessoes_conv  bigint;
BEGIN
  -- Taxa de conversão: sessoes no intervalo -> pedidos convertidos
  SELECT
    COUNT(*) FILTER (WHERE s.criado_em >= v_start AND s.criado_em < v_end),
    COUNT(*) FILTER (WHERE s.criado_em >= v_start AND s.criado_em < v_end AND s.status = 'convertida')
  INTO v_sessoes_total, v_sessoes_conv
  FROM public.sessoes s;

  RETURN QUERY
  SELECT
    COALESCE(SUM(p.valor_total), 0)::numeric                         AS faturamento,
    COUNT(*)::bigint                                                  AS total_pedidos,
    CASE WHEN COUNT(*) > 0
         THEN COALESCE(SUM(p.valor_total), 0) / COUNT(*)
         ELSE 0 END::numeric                                          AS ticket_medio,
    CASE WHEN v_sessoes_total > 0
         THEN (v_sessoes_conv::numeric / v_sessoes_total::numeric) * 100
         ELSE 0 END::numeric                                          AS taxa_conversao
  FROM public.pedidos p
  JOIN public.kanban_coluna k ON k.chave = p.status
  WHERE k.is_revenue_trigger = true
    AND p.entregue_em IS NOT NULL
    AND p.entregue_em >= v_start
    AND p.entregue_em  < v_end;
END;
$$;

COMMENT ON FUNCTION public.get_dashboard_metrics(date, date) IS
'Métricas de faturamento para [p_date_start, p_date_end] em America/Sao_Paulo. '
'Padrão: dia atual. Usa is_revenue_trigger — sem status hardcoded.';

-- ─── 5. get_dashboard_counts(date, date) — substitui 5 queries client-side ──
CREATE OR REPLACE FUNCTION public.get_dashboard_counts(
  p_date_start date,
  p_date_end   date
)
RETURNS TABLE (
  cancelados      bigint,
  em_aberto       bigint,
  clientes_novos  bigint,
  leads           bigint,
  produtos_ativos bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_start timestamptz := p_date_start AT TIME ZONE 'America/Sao_Paulo';
  v_end   timestamptz := (p_date_end + interval '1 day') AT TIME ZONE 'America/Sao_Paulo';
BEGIN
  RETURN QUERY
  SELECT
    -- Pedidos cancelados criados no período
    (SELECT COUNT(*)
     FROM public.pedidos p
     JOIN public.kanban_coluna k ON k.chave = p.status
     WHERE k.is_cancelled = true
       AND p.criado_em >= v_start AND p.criado_em < v_end)::bigint,

    -- Pedidos em aberto (aguardando ação) criados no período
    (SELECT COUNT(*)
     FROM public.pedidos p
     JOIN public.kanban_coluna k ON k.chave = p.status
     WHERE k.is_open = true
       AND p.criado_em >= v_start AND p.criado_em < v_end)::bigint,

    -- Novos clientes identificados (não-visitantes) no período
    (SELECT COUNT(*)
     FROM public.clientes c
     WHERE c.is_visitante = false
       AND c.cliente_desde >= v_start AND c.cliente_desde < v_end)::bigint,

    -- Total de leads (visitantes) — estado atual, sem filtro de data
    (SELECT COUNT(*) FROM public.clientes c WHERE c.is_visitante = true)::bigint,

    -- Total de produtos ativos — estado atual, sem filtro de data
    (SELECT COUNT(*) FROM public.produtos pr WHERE pr.disponivel = true)::bigint;
END;
$$;

COMMENT ON FUNCTION public.get_dashboard_counts(date, date) IS
'Contadores auxiliares para [p_date_start, p_date_end] em America/Sao_Paulo. '
'Usa is_cancelled/is_open — sem status hardcoded.';

-- ─── 6. get_top_produtos(date, date, int) — agregação server-side ────────────
CREATE OR REPLACE FUNCTION public.get_top_produtos(
  p_date_start date,
  p_date_end   date,
  p_limit      int DEFAULT 5
)
RETURNS TABLE (
  produto_id uuid,
  nome       text,
  qtde       bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_start timestamptz := p_date_start AT TIME ZONE 'America/Sao_Paulo';
  v_end   timestamptz := (p_date_end + interval '1 day') AT TIME ZONE 'America/Sao_Paulo';
BEGIN
  RETURN QUERY
  SELECT
    ip.produto_id,
    pr.nome::text,
    SUM(ip.quantidade)::bigint AS qtde
  FROM public.itens_pedido ip
  JOIN public.pedidos        pe ON pe.id     = ip.pedido_id
  JOIN public.kanban_coluna  k  ON k.chave   = pe.status
  JOIN public.produtos        pr ON pr.id    = ip.produto_id
  WHERE pe.criado_em >= v_start
    AND pe.criado_em  < v_end
    AND k.is_cancelled = false
  GROUP BY ip.produto_id, pr.nome
  ORDER BY qtde DESC
  LIMIT p_limit;
END;
$$;

COMMENT ON FUNCTION public.get_top_produtos(date, date, int) IS
'Top N produtos por quantidade no período. Exclui pedidos is_cancelled. Agregação server-side.';

-- ─── 7. Permissões ────────────────────────────────────────────────────────────
REVOKE EXECUTE ON FUNCTION public.get_dashboard_metrics(date, date) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.get_dashboard_metrics(date, date) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_dashboard_counts(date, date) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.get_dashboard_counts(date, date) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_top_produtos(date, date, int) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.get_top_produtos(date, date, int) TO authenticated;

COMMIT;
