-- =====================================================================================
-- MIGRATION: customer intelligence (Customer SKILL + Revenue AI) + retenção de memória
-- Versão: 095
-- =====================================================================================
-- CONTEXTO: `_docs/REVENUE/study.md` v4.0. Duas entregas numa migration porque
-- dependem da mesma decisão de arquitetura: só é possível expurgar a conversa
-- literal (§5) depois que o conhecimento durável passa a viver em forma
-- estruturada (§6). Uma habilita a outra.
--
-- NOMENCLATURA: identificadores novos 100% em INGLÊS (§2 do estudo). O schema
-- legado em português fica congelado — a ponte é a FK
-- (`customer_id REFERENCES public.clientes(id)`), nunca um nome híbrido do tipo
-- `skill_documento`.
--
-- SEM `loja_id`: `clientes` e `pedidos` não têm essa coluna e `loja` é linha
-- única (todo o código a lê com `.limit(1)`). Coluna sem uso é dívida, não
-- preparo para multi-loja.
--
-- O DOCUMENTO DA SKILL NÃO É ARMAZENADO: ele é projetado no turno a partir
-- destes fatos (`server/utils/agent/customerSkill.ts`). Guardar o texto exigiria
-- marca de stale, trigger, worker e coalescing — invalidação de cache para algo
-- que custa microssegundos para reconstruir.
-- =====================================================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. customer_intelligence — fatos materializados, 1:1 com clientes
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.customer_intelligence (
  customer_id        uuid        NOT NULL PRIMARY KEY
                                 REFERENCES public.clientes(id) ON DELETE CASCADE,

  -- Ciclo e retenção
  median_cycle_days  numeric,
  cycle_sample_size  int         NOT NULL DEFAULT 0,
  churn_risk         text        NOT NULL DEFAULT 'no_orders'
    CONSTRAINT customer_intelligence_churn_risk_check
      CHECK (churn_risk IN ('low','medium','high','critical','no_orders')),

  -- Hábito de compra
  delivered_orders   int         NOT NULL DEFAULT 0,
  avg_ticket         numeric,
  top_products       jsonb       NOT NULL DEFAULT '[]'::jsonb,   -- [{name, count}]
  payment_method     text,
  payment_share      numeric,
  delivery_mode      text,
  delivery_share     numeric,
  peak_weekday       int,                                        -- 0 = domingo
  peak_hour          int,
  peak_share         numeric,

  -- Segmento RFM (insumo de abordagem, não tela)
  rfm_recency_q      int,
  rfm_frequency_q    int,
  rfm_monetary_q     int,
  rfm_segment        text
    CONSTRAINT customer_intelligence_rfm_segment_check
      CHECK (rfm_segment IS NULL OR rfm_segment IN ('champion','loyal','at_risk','dormant','new')),

  -- Preferências estruturadas — escritas pela tool no turno, NUNCA pelo job
  preferences        jsonb       NOT NULL DEFAULT '{}'::jsonb,

  computed_at        timestamptz NOT NULL DEFAULT now(),
  atualizado_em      timestamptz NOT NULL DEFAULT now()
);

-- `atualizado_em` mantém o nome legado porque `public.update_updated_at_column()`
-- (migration 003) grava exatamente nessa coluna. Renomear exigiria um trigger
-- próprio só para esta tabela — duplicação pior que a inconsistência.
DROP TRIGGER IF EXISTS trg_customer_intelligence_atualizado_em ON public.customer_intelligence;
CREATE TRIGGER trg_customer_intelligence_atualizado_em
  BEFORE UPDATE ON public.customer_intelligence
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- A leitura do turno é por PK. Este índice serve o job e consultas por risco.
CREATE INDEX IF NOT EXISTS idx_customer_intelligence_churn
  ON public.customer_intelligence (churn_risk, computed_at DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. compute_churn_risk — pura, sem now(): IMMUTABLE é honesto
-- ─────────────────────────────────────────────────────────────────────────────
-- O baseline é o ciclo DO PRÓPRIO CLIENTE, não um limiar global: cliente
-- semanal parado há 14 dias é fator 2.0 (alto); cliente mensal parado há 14
-- dias é fator 0.5 (baixo).
--
-- Declarar IMMUTABLE uma função que chama now() — como fazia o esboço anterior —
-- autoriza o planejador a dobrar a chamada em constante. Aqui o tempo entra por
-- parâmetro e a promessa é verdadeira.
CREATE OR REPLACE FUNCTION private.compute_churn_risk(
  p_days_since  numeric,
  p_cycle_days  numeric
) RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $function$
DECLARE
  factor numeric;
BEGIN
  IF p_days_since IS NULL THEN
    RETURN 'no_orders';
  END IF;

  IF p_cycle_days IS NULL OR p_cycle_days <= 0 THEN
    RETURN CASE
      WHEN p_days_since > 60 THEN 'critical'
      WHEN p_days_since > 30 THEN 'high'
      WHEN p_days_since > 14 THEN 'medium'
      ELSE 'low'
    END;
  END IF;

  factor := p_days_since / p_cycle_days;

  RETURN CASE
    WHEN factor >= 2.5 THEN 'critical'
    WHEN factor >= 1.8 THEN 'high'
    WHEN factor >= 1.2 THEN 'medium'
    ELSE 'low'
  END;
END;
$function$;

REVOKE EXECUTE ON FUNCTION private.compute_churn_risk(numeric, numeric) FROM PUBLIC, anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. recompute_rfm_segments — quintis dentro da base, com piso de amostra
-- Criada ANTES de quem a chama (o esboço anterior a chamava sem nunca criá-la).
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.recompute_rfm_segments()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog'
AS $function$
DECLARE
  eligible int;
BEGIN
  SELECT count(*) INTO eligible
    FROM public.clientes
   WHERE is_visitante IS NOT TRUE
     AND COALESCE(total_pedidos, 0) > 0
     AND ultimo_pedido_em IS NOT NULL;

  -- Quintil sobre base pequena é ruído estatístico, não segmento: com 8
  -- clientes, NTILE(5) rotula alguém de 'dormant' por posição relativa, não por
  -- comportamento. Melhor ausente que inventado.
  IF eligible < 25 THEN
    UPDATE public.customer_intelligence
       SET rfm_recency_q = NULL, rfm_frequency_q = NULL,
           rfm_monetary_q = NULL, rfm_segment = NULL
     WHERE rfm_segment IS NOT NULL;   -- WHERE obrigatório: pg-safeupdate (21000)
    RETURN;
  END IF;

  WITH base AS (
    SELECT
      c.id,
      EXTRACT(EPOCH FROM now() - c.ultimo_pedido_em) / 86400.0 AS days_since,
      COALESCE(c.total_pedidos, 0)                             AS orders,
      COALESCE(c.valor_gasto_acumulado, 0)                     AS spent
    FROM public.clientes c
    WHERE c.is_visitante IS NOT TRUE
      AND COALESCE(c.total_pedidos, 0) > 0
      AND c.ultimo_pedido_em IS NOT NULL
  ),
  quintiles AS (
    SELECT
      id,
      NTILE(5) OVER (ORDER BY days_since DESC) AS r_q,   -- 5 = mais recente
      NTILE(5) OVER (ORDER BY orders     ASC)  AS f_q,
      NTILE(5) OVER (ORDER BY spent      ASC)  AS m_q
    FROM base
  )
  UPDATE public.customer_intelligence ci
     SET rfm_recency_q   = q.r_q,
         rfm_frequency_q = q.f_q,
         rfm_monetary_q  = q.m_q,
         rfm_segment = CASE
           WHEN q.r_q >= 4 AND q.f_q >= 4 AND q.m_q >= 4 THEN 'champion'
           WHEN q.r_q >= 3 AND q.f_q >= 3                THEN 'loyal'
           WHEN q.r_q <= 2 AND q.f_q >= 3                THEN 'at_risk'
           WHEN q.r_q <= 2 AND q.f_q <= 2                THEN 'dormant'
           ELSE 'new'
         END
    FROM quintiles q
   WHERE ci.customer_id = q.id;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.recompute_rfm_segments() FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.recompute_rfm_segments() TO service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. recompute_customer_intelligence — job noturno, UMA passada
-- ─────────────────────────────────────────────────────────────────────────────
-- O esboço anterior repetia a subquery de ciclo médio 4× por cliente, cada uma
-- varrendo `pedidos`. Aqui é uma CTE com window function: O(N+M) em vez de
-- O(N×4×M).
--
-- Ciclo é MEDIANA dos 10 gaps mais recentes, não média de todo o histórico:
-- média é destruída por uma viagem de 3 meses e demora a refletir mudança de
-- hábito. Gap em fração de dia (EPOCH/86400), nunca EXTRACT(DAY), que truncaria
-- dois pedidos no mesmo dia para 0 e puxaria o ciclo para baixo — inflando o
-- risco de churn de todo mundo.
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
    SELECT cliente_id,
           percentile_cont(0.5) WITHIN GROUP (ORDER BY gap_days) AS median_cycle_days,
           count(*)::int                                          AS cycle_sample_size
      FROM recent_gaps
     WHERE rn <= 10
     GROUP BY cliente_id
  ),
  totals AS (
    SELECT cliente_id,
           count(*)::int    AS delivered_orders,
           avg(valor_total) AS avg_ticket
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
               -- `nome_produto_congelado` primeiro: é o nome que o cliente viu
               -- e usou na conversa. `produtos.nome` cobre item sem snapshot.
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
      EXTRACT(EPOCH FROM now() - c.ultimo_pedido_em) / 86400.0,
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

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. purge_agent_memory — a limpeza que o Redis fazia sozinho
-- ─────────────────────────────────────────────────────────────────────────────
-- No fluxo n8n TODO dado de memória tinha TTL: `memoryRedisChat` com
-- sessionTTL=86400, dedup com TTL de 900s, buffer com TTL de 120s. O porte para
-- Postgres preservou a semântica e perdeu o TTL — nenhuma tabela do agente tinha
-- expurgo até aqui. Com transcrição de áudio e descrição de imagem em produção
-- (migration 094), o passivo deixou de ser higiene e virou LGPD.
--
-- Todo DELETE/UPDATE leva WHERE: a Supabase carrega pg-safeupdate e aborta com
-- 21000 sem cláusula, inclusive dentro de SECURITY DEFINER (migrations 038/075/090).
CREATE OR REPLACE FUNCTION public.purge_agent_memory()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog'
AS $function$
DECLARE
  v_conversations int;
  v_media         int;
  v_inbound       int;
  v_buffer        int;
  v_tokens        int;
BEGIN
  -- Conversa literal: o valor durável já foi destilado em customer_intelligence.
  WITH deleted AS (
    DELETE FROM public.whatsapp_conversas
     WHERE criado_em < now() - interval '90 days'
    RETURNING 1
  ) SELECT count(*)::int INTO v_conversations FROM deleted;

  -- Mídia: anonimiza o CONTEÚDO, preserva a linha. O `wamid` é PK e chave de
  -- idempotência (migration 094) — apagar reabriria a janela de reprocessamento.
  -- 30 dias porque o `media_id` do provedor expira nesse prazo de qualquer forma.
  WITH updated AS (
    UPDATE public.whatsapp_midia
       SET texto = NULL, erro = NULL
     WHERE criado_em < now() - interval '30 days'
       AND (texto IS NOT NULL OR erro IS NOT NULL)
    RETURNING 1
  ) SELECT count(*)::int INTO v_media FROM updated;

  -- Dedup de reentrega: a Meta reentrega em minutos; o n8n usava 15 min de TTL.
  -- Coluna é `recebido_em` (a tabela tem só `wamid` + `recebido_em`).
  WITH deleted AS (
    DELETE FROM public.whatsapp_mensagens_recebidas
     WHERE recebido_em < now() - interval '7 days'
    RETURNING 1
  ) SELECT count(*)::int INTO v_inbound FROM deleted;

  -- Buffer de rajada: vive segundos. Linha com 2 dias é resíduo de falha.
  WITH deleted AS (
    DELETE FROM public.whatsapp_turno_buffer
     WHERE atualizado_em < now() - interval '2 days'
    RETURNING 1
  ) SELECT count(*)::int INTO v_buffer FROM deleted;

  -- Telemetria de custo: 13 meses permite comparação ano a ano.
  WITH deleted AS (
    DELETE FROM public.agente_uso_tokens
     WHERE criado_em < now() - interval '13 months'
    RETURNING 1
  ) SELECT count(*)::int INTO v_tokens FROM deleted;

  RETURN jsonb_build_object(
    'conversations',    v_conversations,
    'media_anonymized', v_media,
    'inbound_dedup',    v_inbound,
    'burst_buffer',     v_buffer,
    'token_usage',      v_tokens,
    'executed_at',      now()
  );
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.purge_agent_memory() FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.purge_agent_memory() TO service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. RLS
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.customer_intelligence ENABLE ROW LEVEL SECURITY;

-- `private.is_staff()` (migration 038), nunca `public.is_staff()`.
-- `TO authenticated` e não TO PUBLIC: policy em PUBLIC quebrava `anon` com 42501
-- dentro de has_role em rotas públicas (corrigido na migration 072).
DROP POLICY IF EXISTS "Staff read customer_intelligence" ON public.customer_intelligence;
CREATE POLICY "Staff read customer_intelligence" ON public.customer_intelligence
  FOR SELECT TO authenticated
  USING (private.is_staff());

-- Sem policy de INSERT/UPDATE/DELETE: escrita é exclusiva do job noturno e do
-- agente, ambos service_role (que bypassa RLS). Staff não edita fato derivado à
-- mão — o próximo recompute sobrescreveria em silêncio.

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. pg_cron
-- ─────────────────────────────────────────────────────────────────────────────
-- Idioma do projeto: `SELECT cron.schedule(...)` com guarda de existência
-- (migration 033). `INSERT INTO cron.job ... ON CONFLICT (jobname)` não funciona:
-- não há UNIQUE em `jobname`.
SELECT cron.schedule(
  'customer-intelligence-recompute',
  '0 6 * * *',                          -- 03:00 BRT
  'SELECT public.recompute_customer_intelligence();'
) WHERE NOT EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'customer-intelligence-recompute'
);

SELECT cron.schedule(
  'agent-memory-purge',
  '30 6 * * *',                         -- 03:30 BRT, depois do recompute
  'SELECT public.purge_agent_memory();'
) WHERE NOT EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'agent-memory-purge'
);

COMMIT;

-- Primeira carga fora da transação: em base grande a varredura é longa e não há
-- razão para segurar locks do DDL junto.
-- SELECT public.recompute_customer_intelligence();

-- =====================================================================================
-- DOWN (rollback manual):
--   SELECT cron.unschedule('agent-memory-purge');
--   SELECT cron.unschedule('customer-intelligence-recompute');
--   DROP FUNCTION IF EXISTS public.purge_agent_memory();
--   DROP FUNCTION IF EXISTS public.recompute_customer_intelligence();
--   DROP FUNCTION IF EXISTS public.recompute_rfm_segments();
--   DROP FUNCTION IF EXISTS private.compute_churn_risk(numeric, numeric);
--   DROP TABLE IF EXISTS public.customer_intelligence;
-- =====================================================================================
