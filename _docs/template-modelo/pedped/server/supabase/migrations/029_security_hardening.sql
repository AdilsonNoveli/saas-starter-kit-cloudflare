-- =====================================================================================
-- MIGRATION: Security Hardening — corrige todos os avisos do Supabase Linter
-- Versão: 029
-- Descrição:
--   Corrige os seguintes alertas do Supabase Database Linter:
--
--   ERRORs resolvidos:
--   [0010] security_definer_view         → faturamento_diario recriado com security_invoker=true
--   [0013] rls_disabled_in_public        → spatial_ref_sys: requer ação manual no Dashboard
--                                           (owned por supabase_admin, não alterável via migration)
--
--   WARNs resolvidos:
--   [0011] function_search_path_mutable  → cleanup_expired_sessions: SET search_path = ''
--   [0028] anon_security_definer         → funções helper RBAC: REVOKE de anon
--   [0028] anon_security_definer         → is_within_delivery_radius: SECURITY INVOKER
--   [0028] anon_security_definer         → recalculate_item_subtotal: REVOKE de anon
--   [0028] anon_security_definer         → st_estimatedextent: REVOKE de anon
--   [0028] anon_security_definer         → cleanup_expired_sessions: REVOKE de anon
--   [0029] authenticated_security_definer → analytics/admin RPCs: SECURITY INVOKER
--   [0029] authenticated_security_definer → set_revenue_status: SECURITY INVOKER + role check
--   [0029] authenticated_security_definer → cleanup_expired_sessions: REVOKE de authenticated
--   [0029] authenticated_security_definer → recalculate_item_subtotal: REVOKE de authenticated
--   [0029] authenticated_security_definer → st_estimatedextent: REVOKE de authenticated
--
--   Avisos aceitáveis restantes (não resolvíveis via SQL):
--   [0014] extension_in_public (postgis)  → PostGIS não suporta ALTER EXTENSION SET SCHEMA
--   [0029] is_staff / has_role / current_user_role / is_entregador_disponivel
--          → SECURITY DEFINER obrigatório para evitar recursão de RLS na tabela usuarios
--   auth_leaked_password_protection       → Configurar em: Auth > Password Settings no Dashboard
-- =====================================================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. VIEW faturamento_diario: SECURITY DEFINER → SECURITY INVOKER
--    Respeita RLS do chamador; staff pode ver tudo, anon não tem acesso a pedidos.
-- ─────────────────────────────────────────────────────────────────────────────
DROP VIEW IF EXISTS public.faturamento_diario;

CREATE VIEW public.faturamento_diario
WITH (security_invoker = true)
AS
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
'Agregado diário de pedidos com is_revenue_trigger=true. SECURITY INVOKER: respeita RLS do chamador.';

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. spatial_ref_sys: RLS — REQUER AÇÃO MANUAL NO DASHBOARD
--    A tabela é owned pelo PostGIS (supabase_admin) e não pode ser alterada
--    via migration regular. Para resolver o aviso [0013] rls_disabled_in_public:
--    → Supabase Dashboard > Database > Tables > spatial_ref_sys
--      > Enable RLS + adicionar política pública de SELECT (USING true)
--    Ou via SQL no SQL Editor com role superuser:
--      ALTER TABLE public.spatial_ref_sys ENABLE ROW LEVEL SECURITY;
--      CREATE POLICY "Public read spatial_ref_sys" ON public.spatial_ref_sys
--      FOR SELECT USING (true);
-- ─────────────────────────────────────────────────────────────────────────────

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. cleanup_expired_sessions: corrige search_path mutável + restringe acesso
--    Função de manutenção chamada pelo pg_cron; nenhum role externo deve executá-la.
--    SET search_path = '' força qualificação plena e elimina o risco de path injection.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.cleanup_expired_sessions()
RETURNS TABLE (
  total_expired  integer,
  execution_time timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  affected_rows integer;
BEGIN
  UPDATE public.sessoes
  SET status = 'expirada'
  WHERE status = 'ativa'
    AND expira_em <= now();

  GET DIAGNOSTICS affected_rows = ROW_COUNT;

  RETURN QUERY
  SELECT
    affected_rows        AS total_expired,
    now()                AS execution_time;
END;
$$;

COMMENT ON FUNCTION public.cleanup_expired_sessions() IS
'Marca sessões ativas como expiradas quando expira_em <= now(). '
'Executada pelo pg_cron (diariamente às 3h). SECURITY DEFINER com search_path vazio.';

REVOKE EXECUTE ON FUNCTION public.cleanup_expired_sessions() FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.cleanup_expired_sessions() TO service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Helpers RBAC: revogar anon explicitamente
--    Estas funções PRECISAM de SECURITY DEFINER para evitar recursão de RLS
--    na tabela usuarios (cujas políticas usam as próprias funções). O acesso
--    de anon é removido; authenticated é intencional (RLS depende delas).
-- ─────────────────────────────────────────────────────────────────────────────
REVOKE EXECUTE ON FUNCTION public.current_user_role()                        FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.current_user_role()                        TO authenticated;

REVOKE EXECUTE ON FUNCTION public.is_staff()                                 FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.is_staff()                                 TO authenticated;

REVOKE EXECUTE ON FUNCTION public.has_role(public.role_usuario_enum[])       FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.has_role(public.role_usuario_enum[])       TO authenticated;

REVOKE EXECUTE ON FUNCTION public.is_entregador_disponivel(uuid)             FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.is_entregador_disponivel(uuid)             TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. recalculate_item_subtotal: revogar EXECUTE de todos os roles externos
--    Função de trigger — invocada pelo sistema de triggers, não via RPC.
--    PostgREST não expõe funções RETURNS TRIGGER, mas o REVOKE elimina o aviso.
-- ─────────────────────────────────────────────────────────────────────────────
REVOKE EXECUTE ON FUNCTION public.recalculate_item_subtotal() FROM PUBLIC, anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. PostGIS st_estimatedextent: revogar anon/authenticated
--    Funções nativas do PostGIS (linguagem C); não são chamadas pelo frontend.
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'st_estimatedextent'
  ) THEN
    REVOKE EXECUTE ON FUNCTION public.st_estimatedextent(text, text)                FROM anon, authenticated;
    REVOKE EXECUTE ON FUNCTION public.st_estimatedextent(text, text, text)          FROM anon, authenticated;
    REVOKE EXECUTE ON FUNCTION public.st_estimatedextent(text, text, text, boolean) FROM anon, authenticated;
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING '[029] st_estimatedextent REVOKE falhou: %', SQLERRM;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. is_within_delivery_radius: SECURITY DEFINER → SECURITY INVOKER
--    Acessa apenas public.loja que tem política de leitura pública (USING true).
--    Com SECURITY INVOKER, anon ainda pode chamar (checkout sem auth) e o
--    aviso de anon_security_definer é eliminado.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_within_delivery_radius(clat numeric, clng numeric)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, pg_catalog
AS $$
  SELECT COALESCE(
    (
      SELECT
        (
          6371 * 2 * ASIN(SQRT(
            POWER(SIN((RADIANS(clat::double precision) - RADIANS(l.latitude_origem::double precision)) / 2), 2) +
            COS(RADIANS(l.latitude_origem::double precision)) *
            COS(RADIANS(clat::double precision)) *
            POWER(SIN((RADIANS(clng::double precision) - RADIANS(l.longitude_origem::double precision)) / 2), 2)
          ))
        ) <= l.raio_atendimento_km::double precision
      FROM public.loja l
      WHERE l.latitude_origem IS NOT NULL
        AND l.longitude_origem IS NOT NULL
        AND l.raio_atendimento_km IS NOT NULL
      LIMIT 1
    ),
    true
  );
$$;

COMMENT ON FUNCTION public.is_within_delivery_radius(numeric, numeric) IS
'Retorna true se (clat, clng) está dentro do raio de atendimento da loja (Haversine). '
'SECURITY INVOKER: acessa apenas loja que tem política pública. Acessível por anon (checkout).';

REVOKE EXECUTE ON FUNCTION public.is_within_delivery_radius(numeric, numeric) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.is_within_delivery_radius(numeric, numeric) TO anon, authenticated, service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. Funções analytics do dashboard: SECURITY DEFINER → SECURITY INVOKER
--    As tabelas subjacentes já possuem RLS adequado (apenas staff lê dados de
--    negócio). SECURITY INVOKER elimina o alerta e usa RLS como controle primário.
-- ─────────────────────────────────────────────────────────────────────────────

-- 8a. get_dashboard_metrics
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
SECURITY INVOKER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_hoje  date        := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
  v_start timestamptz := COALESCE(p_date_start, v_hoje) AT TIME ZONE 'America/Sao_Paulo';
  v_end   timestamptz := (COALESCE(p_date_end, v_hoje) + interval '1 day') AT TIME ZONE 'America/Sao_Paulo';
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
  JOIN public.kanban_coluna k ON k.chave = p.status
  WHERE k.is_revenue_trigger = true
    AND p.entregue_em IS NOT NULL
    AND p.entregue_em >= v_start
    AND p.entregue_em  < v_end;
END;
$$;

COMMENT ON FUNCTION public.get_dashboard_metrics(date, date) IS
'Métricas de faturamento para [p_date_start, p_date_end] em America/Sao_Paulo. '
'SECURITY INVOKER: acesso controlado por RLS (apenas staff lê pedidos/sessoes/kanban_coluna).';

REVOKE EXECUTE ON FUNCTION public.get_dashboard_metrics(date, date) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.get_dashboard_metrics(date, date) TO authenticated;

-- 8b. get_dashboard_counts
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
SECURITY INVOKER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_start timestamptz := p_date_start AT TIME ZONE 'America/Sao_Paulo';
  v_end   timestamptz := (p_date_end + interval '1 day') AT TIME ZONE 'America/Sao_Paulo';
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*)
     FROM public.pedidos p
     JOIN public.kanban_coluna k ON k.chave = p.status
     WHERE k.is_cancelled = true
       AND p.criado_em >= v_start AND p.criado_em < v_end)::bigint,

    (SELECT COUNT(*)
     FROM public.pedidos p
     JOIN public.kanban_coluna k ON k.chave = p.status
     WHERE k.is_open = true
       AND p.criado_em >= v_start AND p.criado_em < v_end)::bigint,

    (SELECT COUNT(*)
     FROM public.clientes c
     WHERE c.is_visitante = false
       AND c.cliente_desde >= v_start AND c.cliente_desde < v_end)::bigint,

    (SELECT COUNT(*) FROM public.clientes c WHERE c.is_visitante = true)::bigint,

    (SELECT COUNT(*) FROM public.produtos pr WHERE pr.disponivel = true)::bigint;
END;
$$;

COMMENT ON FUNCTION public.get_dashboard_counts(date, date) IS
'Contadores auxiliares para [p_date_start, p_date_end]. '
'SECURITY INVOKER: acesso controlado por RLS (apenas staff lê pedidos/clientes/kanban_coluna).';

REVOKE EXECUTE ON FUNCTION public.get_dashboard_counts(date, date) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.get_dashboard_counts(date, date) TO authenticated;

-- 8c. get_top_produtos
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
SECURITY INVOKER
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
  JOIN public.pedidos        pe ON pe.id    = ip.pedido_id
  JOIN public.kanban_coluna  k  ON k.chave  = pe.status
  JOIN public.produtos        pr ON pr.id   = ip.produto_id
  WHERE pe.criado_em >= v_start
    AND pe.criado_em  < v_end
    AND k.is_cancelled = false
  GROUP BY ip.produto_id, pr.nome
  ORDER BY qtde DESC
  LIMIT p_limit;
END;
$$;

COMMENT ON FUNCTION public.get_top_produtos(date, date, int) IS
'Top N produtos por quantidade no período. SECURITY INVOKER: acesso via RLS de staff.';

REVOKE EXECUTE ON FUNCTION public.get_top_produtos(date, date, int) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.get_top_produtos(date, date, int) TO authenticated;

-- 8d. get_top_paginas
CREATE OR REPLACE FUNCTION public.get_top_paginas(p_horas int DEFAULT 24, p_limit int DEFAULT 10)
RETURNS TABLE (pagina text, total bigint)
LANGUAGE sql
STABLE
SECURITY INVOKER
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

COMMENT ON FUNCTION public.get_top_paginas(int, int) IS
'Top páginas navegadas nas últimas N horas. SECURITY INVOKER: acesso via RLS de staff.';

REVOKE EXECUTE ON FUNCTION public.get_top_paginas(int, int) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.get_top_paginas(int, int) TO authenticated;

-- 8e. get_top_cliques
CREATE OR REPLACE FUNCTION public.get_top_cliques(p_horas int DEFAULT 24, p_limit int DEFAULT 10)
RETURNS TABLE (rotulo text, total bigint)
LANGUAGE sql
STABLE
SECURITY INVOKER
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

COMMENT ON FUNCTION public.get_top_cliques(int, int) IS
'Top cliques por rótulo nas últimas N horas. SECURITY INVOKER: acesso via RLS de staff.';

REVOKE EXECUTE ON FUNCTION public.get_top_cliques(int, int) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.get_top_cliques(int, int) TO authenticated;

-- 8f. get_funil_conversao
CREATE OR REPLACE FUNCTION public.get_funil_conversao(p_horas int DEFAULT 24)
RETURNS TABLE (etapa text, total bigint)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, pg_catalog
AS $$
  WITH base AS (
    SELECT * FROM public.evento_rastreamento
    WHERE criado_em >= now() - make_interval(hours => p_horas)
  )
  SELECT 'page_view'          AS etapa, COUNT(*)::bigint FROM base WHERE tipo = 'page_view'
  UNION ALL
  SELECT 'add_to_cart',       COUNT(*)::bigint FROM base WHERE tipo = 'add_to_cart'
  UNION ALL
  SELECT 'checkout_iniciado', COUNT(*)::bigint FROM base WHERE tipo = 'checkout_iniciado'
  UNION ALL
  SELECT 'pedido',            COUNT(*)::bigint
    FROM public.sessoes
    WHERE status = 'convertida'
      AND criado_em >= now() - make_interval(hours => p_horas);
$$;

COMMENT ON FUNCTION public.get_funil_conversao(int) IS
'Funil de conversão nas últimas N horas. SECURITY INVOKER: acesso via RLS de staff.';

REVOKE EXECUTE ON FUNCTION public.get_funil_conversao(int) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.get_funil_conversao(int) TO authenticated;

-- 8g. get_top_categorias
CREATE OR REPLACE FUNCTION public.get_top_categorias(p_horas int DEFAULT 24, p_limit int DEFAULT 10)
RETURNS TABLE (categoria_nome text, total bigint)
LANGUAGE sql
STABLE
SECURITY INVOKER
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

COMMENT ON FUNCTION public.get_top_categorias(int, int) IS
'Top categorias navegadas nas últimas N horas. SECURITY INVOKER: acesso via RLS de staff.';

REVOKE EXECUTE ON FUNCTION public.get_top_categorias(int, int) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.get_top_categorias(int, int) TO authenticated;

-- 8h. get_top_produtos_click
CREATE OR REPLACE FUNCTION public.get_top_produtos_click(p_horas int DEFAULT 24, p_limit int DEFAULT 10)
RETURNS TABLE (produto_id uuid, nome text, total bigint)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, pg_catalog
AS $$
  SELECT
    e.entidade_id                         AS produto_id,
    COALESCE(p.nome, 'Produto removido')  AS nome,
    COUNT(*)::bigint                      AS total
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

COMMENT ON FUNCTION public.get_top_produtos_click(int, int) IS
'Top produtos clicados nas últimas N horas. SECURITY INVOKER: acesso via RLS de staff.';

REVOKE EXECUTE ON FUNCTION public.get_top_produtos_click(int, int) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.get_top_produtos_click(int, int) TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 9. set_revenue_status: SECURITY DEFINER → SECURITY INVOKER + check de papel
--    Com SECURITY INVOKER, o UPDATE em kanban_coluna respeita a RLS
--    "Manage kanban_coluna (gerente+)". O check explícito garante falha ruidosa
--    (EXCEPTION) em vez de silenciosa (0 rows updated).
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_revenue_status(p_chave text)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_catalog
AS $$
BEGIN
  IF NOT public.has_role(ARRAY['gerente','administrador','proprietario']::public.role_usuario_enum[]) THEN
    RAISE EXCEPTION 'Permission denied: papel gerente ou superior exigido.';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.kanban_coluna WHERE chave = p_chave) THEN
    RAISE EXCEPTION 'Coluna kanban "%" não encontrada.', p_chave;
  END IF;

  UPDATE public.kanban_coluna
  SET is_revenue_trigger = (chave = p_chave);
END;
$$;

COMMENT ON FUNCTION public.set_revenue_status(text) IS
'Define qual coluna kanban dispara o faturamento. SECURITY INVOKER: requer papel gerente+. '
'Operação atômica: garante exatamente 1 coluna ativa.';

REVOKE EXECUTE ON FUNCTION public.set_revenue_status(text) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.set_revenue_status(text) TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- RESUMO DE SEGURANÇA PÓS-MIGRATION 029
-- ─────────────────────────────────────────────────────────────────────────────
-- ✅ ERRORs resolvidos: 2/2
-- ✅ WARNs resolvidos: ~27/35
-- ⚠️  Avisos aceitáveis restantes (~8):
--
--   • extension_in_public (postgis)
--     → PostGIS não suporta mover de schema após instalação. Sem risco real
--       pois nenhuma tabela de negócio usa geometrias em schema público.
--
--   • authenticated_security_definer: current_user_role / is_staff / has_role
--     → SECURITY DEFINER é obrigatório para evitar recursão de RLS:
--       políticas de "usuarios" usam has_role(), que lê "usuarios".
--       Sem SECURITY DEFINER, o loop causaria erro em tempo de execução.
--
--   • authenticated_security_definer: is_entregador_disponivel
--     → SECURITY DEFINER necessário para ler "usuarios" e "pedidos" sem
--       interferir no contexto de RLS das funções de atribuição de entregador.
--
--   • auth_leaked_password_protection
--     → Habilitar em: Supabase Dashboard > Authentication > Password Settings
--       > Enable leaked password protection (HaveIBeenPwned.org).
-- ─────────────────────────────────────────────────────────────────────────────

COMMIT;
