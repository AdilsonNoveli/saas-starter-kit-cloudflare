-- =====================================================================================
-- MIGRATION: corrige o tipo do ciclo em recompute_customer_intelligence
-- Versão: 096
-- =====================================================================================
-- CONTEXTO: a 095 criou `recompute_customer_intelligence()` com um erro de tipo que
-- o `CREATE FUNCTION` não pega — o corpo de uma função plpgsql não é validado na
-- criação, só na execução. A migration aplicou sem reclamar e o job falhava a
-- cada execução:
--
--   ERRO 42883: function private.compute_churn_risk(numeric, double precision)
--               does not exist
--
-- CAUSA: `percentile_cont(0.5) WITHIN GROUP (ORDER BY gap_days)` devolve
-- `double precision` (é a assinatura da agregação no Postgres, independente de
-- `gap_days` ser numeric). `compute_churn_risk` declara `(numeric, numeric)`, e o
-- Postgres **não** faz a conversão implícita de double precision para numeric na
-- resolução de função — a perda de precisão exigiria cast explícito.
--
-- CORREÇÃO: cast do percentil para `numeric` dentro da CTE `cycles`. Feito ali, e
-- não no ponto da chamada, porque `median_cycle_days` também é gravado numa coluna
-- `numeric` — o tipo passa a ser coerente do cálculo até a persistência, em vez de
-- só onde o erro apareceu.
--
-- Detectado por `server/supabase/customerIntelligence.integration.test.ts`, que
-- roda o RPC contra o banco real. Os testes de unidade cobrem a camada TypeScript
-- e não tocam no SQL — este erro era invisível para eles.
--
-- A 095 fica como está (já aplicada); o `init.sql` recebeu a versão corrigida.
-- =====================================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.recompute_customer_intelligence()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog'
AS $function$
BEGIN
  WITH valid_orders AS (
    SELECT p.cliente_id, p.criado_em, p.valor_total, p.forma_pagamento, p.tipo_entrega
      FROM public.pedidos p
     WHERE p.cliente_id IS NOT NULL
       AND p.arquivado IS NOT TRUE
  ),
  gaps AS (
    SELECT
      cliente_id,
      criado_em,
      EXTRACT(EPOCH FROM criado_em
              - LAG(criado_em) OVER (PARTITION BY cliente_id ORDER BY criado_em)
             ) / 86400.0 AS gap_days
    FROM valid_orders
  ),
  recent_gaps AS (
    SELECT cliente_id, gap_days,
           ROW_NUMBER() OVER (PARTITION BY cliente_id ORDER BY criado_em DESC) AS rn
      FROM gaps
     WHERE gap_days IS NOT NULL
  ),
  cycles AS (
    -- ::numeric — percentile_cont devolve double precision (correção da 096).
    SELECT cliente_id,
           (percentile_cont(0.5) WITHIN GROUP (ORDER BY gap_days))::numeric AS median_cycle_days,
           count(*)::int                                                    AS cycle_sample_size
      FROM recent_gaps
     WHERE rn <= 10
     GROUP BY cliente_id
  ),
  totals AS (
    SELECT cliente_id, count(*)::int AS delivered_orders, avg(valor_total) AS avg_ticket
      FROM valid_orders
     GROUP BY cliente_id
  ),
  payment AS (
    SELECT DISTINCT ON (cliente_id)
           cliente_id, forma_pagamento,
           count(*)::numeric / sum(count(*)) OVER (PARTITION BY cliente_id) AS share
      FROM valid_orders
     WHERE forma_pagamento IS NOT NULL
     GROUP BY cliente_id, forma_pagamento
     ORDER BY cliente_id, count(*) DESC
  ),
  delivery AS (
    SELECT DISTINCT ON (cliente_id)
           cliente_id, tipo_entrega,
           count(*)::numeric / sum(count(*)) OVER (PARTITION BY cliente_id) AS share
      FROM valid_orders
     WHERE tipo_entrega IS NOT NULL
     GROUP BY cliente_id, tipo_entrega
     ORDER BY cliente_id, count(*) DESC
  ),
  peak AS (
    SELECT DISTINCT ON (cliente_id)
           cliente_id,
           EXTRACT(DOW  FROM criado_em)::int AS weekday,
           EXTRACT(HOUR FROM criado_em)::int AS hour,
           count(*)::numeric / sum(count(*)) OVER (PARTITION BY cliente_id) AS share
      FROM valid_orders
     GROUP BY cliente_id, EXTRACT(DOW FROM criado_em), EXTRACT(HOUR FROM criado_em)
     ORDER BY cliente_id, count(*) DESC
  ),
  favorites AS (
    SELECT ranked.cliente_id,
           jsonb_agg(jsonb_build_object('name', ranked.nome, 'count', ranked.n)
                     ORDER BY ranked.n DESC) FILTER (WHERE ranked.rn <= 3) AS top_products
      FROM (
        SELECT o.cliente_id,
               COALESCE(i.nome_produto_congelado, pr.nome) AS nome,
               count(*)::int                               AS n,
               ROW_NUMBER() OVER (
                 PARTITION BY o.cliente_id ORDER BY count(*) DESC
               )                                           AS rn
          FROM public.itens_pedido i
          JOIN public.pedidos o        ON o.id  = i.pedido_id
          LEFT JOIN public.produtos pr ON pr.id = i.produto_id
         WHERE o.cliente_id IS NOT NULL
           AND o.arquivado IS NOT TRUE
           AND COALESCE(i.nome_produto_congelado, pr.nome) IS NOT NULL
         GROUP BY o.cliente_id, COALESCE(i.nome_produto_congelado, pr.nome)
      ) ranked
     GROUP BY ranked.cliente_id
  )
  INSERT INTO public.customer_intelligence AS ci (
    customer_id, median_cycle_days, cycle_sample_size, churn_risk,
    delivered_orders, avg_ticket, top_products,
    payment_method, payment_share, delivery_mode, delivery_share,
    peak_weekday, peak_hour, peak_share, computed_at
  )
  SELECT
    c.id,
    cy.median_cycle_days,
    COALESCE(cy.cycle_sample_size, 0),
    private.compute_churn_risk(
      (EXTRACT(EPOCH FROM now() - c.ultimo_pedido_em) / 86400.0)::numeric,
      cy.median_cycle_days
    ),
    COALESCE(t.delivered_orders, 0),
    t.avg_ticket,
    COALESCE(f.top_products, '[]'::jsonb),
    pm.forma_pagamento, pm.share,
    dl.tipo_entrega,    dl.share,
    pk.weekday, pk.hour, pk.share,
    now()
  FROM public.clientes c
  LEFT JOIN cycles    cy ON cy.cliente_id = c.id
  LEFT JOIN totals    t  ON t.cliente_id  = c.id
  LEFT JOIN payment   pm ON pm.cliente_id = c.id
  LEFT JOIN delivery  dl ON dl.cliente_id = c.id
  LEFT JOIN peak      pk ON pk.cliente_id = c.id
  LEFT JOIN favorites f  ON f.cliente_id  = c.id
  WHERE c.is_visitante IS NOT TRUE
  ON CONFLICT (customer_id) DO UPDATE SET
    median_cycle_days = EXCLUDED.median_cycle_days,
    cycle_sample_size = EXCLUDED.cycle_sample_size,
    churn_risk        = EXCLUDED.churn_risk,
    delivered_orders  = EXCLUDED.delivered_orders,
    avg_ticket        = EXCLUDED.avg_ticket,
    top_products      = EXCLUDED.top_products,
    payment_method    = EXCLUDED.payment_method,
    payment_share     = EXCLUDED.payment_share,
    delivery_mode     = EXCLUDED.delivery_mode,
    delivery_share    = EXCLUDED.delivery_share,
    peak_weekday      = EXCLUDED.peak_weekday,
    peak_hour         = EXCLUDED.peak_hour,
    peak_share        = EXCLUDED.peak_share,
    computed_at       = EXCLUDED.computed_at;
    -- `preferences` NUNCA é tocada aqui: quem escreve é a tool, no turno.

  PERFORM public.recompute_rfm_segments();
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.recompute_customer_intelligence() FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.recompute_customer_intelligence() TO service_role;

COMMIT;

-- Primeira carga (a da 095 nunca chegou a rodar por causa do erro acima):
--   SELECT public.recompute_customer_intelligence();

-- =====================================================================================
-- DOWN: reaplicar o corpo da migration 095 (sem os casts). Não recomendado —
-- aquela versão não executa.
-- =====================================================================================
