-- =====================================================================================
-- MIGRATION: Unifica capacidade diária de encomenda com Gestão de Estoque
-- Versão: 113
-- =====================================================================================
-- CONTEXTO: `preorder_config.daily_capacity` (migration 078) e
-- `produtos.producao_diaria_limite` (migration 111) eram DUAS configurações
-- de "capacidade por dia" pro mesmo produto — redundante na UI admin (dois
-- campos "Capacidade limite diária") e ambíguo pro agente, que devia receber
-- uma ÚNICA informação sobre limitação de estoque (ver systemPrompt.ts,
-- QUANTITY_LIMITS_NOTE).
--
-- Resolução: `produtos.producao_diaria_limite` passa a ser a ÚNICA fonte.
-- `reserve_preorders` (encomenda, capacidade por DATA agendada, tabela
-- `preorders`) e `consumir_estoque_pedido` (estoque 'producao_diaria',
-- capacidade só de HOJE, tabela `estoque_movimentacoes`) continuam sendo
-- mecanismos DIFERENTES por baixo — datas agendadas vs. hoje são conceitos
-- distintos que não dá pra fundir sem quebrar um dos dois — mas agora leem o
-- MESMO número. `migration 112` continua válida e necessária: pra produto de
-- encomenda, `controle_estoque` nunca é 'producao_diaria' (esse valor
-- continua exclusivo de produto de pronta entrega) — a capacidade de
-- encomenda fica em `producao_diaria_limite` INDEPENDENTE de
-- `controle_estoque`, sempre obrigatória enquanto `product_type='preorder'`.
-- =====================================================================================

BEGIN;

-- 1. Migra o valor já configurado (produto de encomenda existente não pode
--    perder a capacidade que já tinha e virar "sem limite" da noite pro dia).
UPDATE public.produtos
   SET producao_diaria_limite = (preorder_config->>'daily_capacity')::numeric
 WHERE product_type = 'preorder'
   AND preorder_config ? 'daily_capacity'
   AND (preorder_config->>'daily_capacity') ~ '^\d+(\.\d+)?$';

-- 2. Remove a chave antiga do JSON — fonte única a partir de agora.
UPDATE public.produtos
   SET preorder_config = preorder_config - 'daily_capacity'
 WHERE product_type = 'preorder'
   AND preorder_config ? 'daily_capacity';

-- 3. reserve_preorders: lê producao_diaria_limite de produtos em vez de
--    preorder_config->>'daily_capacity'. Mesma assinatura, mesmo corpo fora
--    da fonte da capacidade — CREATE OR REPLACE só troca isso.
CREATE OR REPLACE FUNCTION public.reserve_preorders(p_order_id uuid, p_items jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_item          jsonb;
  v_product_id    uuid;
  v_date          date;
  v_qty           numeric;
  v_produto       record;
  v_cfg           jsonb;
  v_capacity      numeric;
  v_min_qty       numeric;
  v_max_qty       numeric;
  v_min_lead      integer;
  v_max_lead      integer;
  v_used          numeric;
  v_today         date := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
  v_dow           text;
  v_horarios      jsonb;
BEGIN
  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'PREORDER_INVALID_PAYLOAD' USING ERRCODE = 'check_violation';
  END IF;

  SELECT config_horarios INTO v_horarios FROM public.loja LIMIT 1;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_product_id := (v_item->>'product_id')::uuid;
    v_date       := (v_item->>'delivery_date')::date;
    v_qty        := (v_item->>'quantity')::numeric;

    IF v_product_id IS NULL OR v_date IS NULL OR v_qty IS NULL OR v_qty <= 0 THEN
      RAISE EXCEPTION 'PREORDER_INVALID_PAYLOAD' USING ERRCODE = 'check_violation';
    END IF;

    SELECT id, product_type, preorder_config, producao_diaria_limite, unidade_medida,
           COALESCE(preco_promocional, preco_venda) AS unit_price
      INTO v_produto
      FROM public.produtos
     WHERE id = v_product_id;

    IF v_produto.id IS NULL OR v_produto.product_type <> 'preorder'
       OR v_produto.preorder_config IS NULL THEN
      RAISE EXCEPTION 'PREORDER_INVALID_PRODUCT' USING ERRCODE = 'check_violation',
        DETAIL = format('Produto %s não aceita encomenda.', v_product_id);
    END IF;

    v_cfg      := v_produto.preorder_config;
    -- Capacidade diária: migration 113 — fonte única com Gestão de Estoque
    -- (produtos.producao_diaria_limite), não mais preorder_config JSON.
    v_capacity := v_produto.producao_diaria_limite;
    v_min_qty  := COALESCE((v_cfg->>'min_quantity')::numeric, 0);
    v_max_qty  := COALESCE((v_cfg->>'max_quantity')::numeric, 'Infinity'::numeric);
    v_min_lead := COALESCE((v_cfg->>'min_lead_days')::integer, 0);
    v_max_lead := COALESCE((v_cfg->>'max_lead_days')::integer, 365);

    IF v_qty < v_min_qty OR v_qty > v_max_qty THEN
      RAISE EXCEPTION 'PREORDER_INVALID_QUANTITY' USING ERRCODE = 'check_violation',
        DETAIL = format('Quantidade %s fora do intervalo [%s, %s].', v_qty, v_min_qty, v_max_qty);
    END IF;

    IF v_date < v_today + v_min_lead OR v_date > v_today + v_max_lead THEN
      RAISE EXCEPTION 'PREORDER_DATE_UNAVAILABLE' USING ERRCODE = 'check_violation',
        DETAIL = format('Data %s fora da janela de antecedência.', v_date);
    END IF;

    v_dow := extract(dow FROM v_date)::int::text;
    IF v_horarios IS NOT NULL AND COALESCE(v_horarios->v_dow->>'aberto', 'false') <> 'true' THEN
      RAISE EXCEPTION 'PREORDER_DATE_UNAVAILABLE' USING ERRCODE = 'check_violation',
        DETAIL = format('Loja fechada em %s.', v_date);
    END IF;

    IF EXISTS (
      SELECT 1 FROM public.preorder_blocked_dates b
       WHERE b.blocked_date = v_date
         AND (b.product_id IS NULL OR b.product_id = v_product_id)
    ) THEN
      RAISE EXCEPTION 'PREORDER_DATE_UNAVAILABLE' USING ERRCODE = 'check_violation',
        DETAIL = format('Data %s bloqueada.', v_date);
    END IF;

    PERFORM pg_advisory_xact_lock(
      hashtextextended(v_product_id::text || ':' || v_date::text, 0));

    SELECT COALESCE(SUM(pr.quantity), 0) INTO v_used
      FROM public.preorders pr
      JOIN public.pedidos pe ON pe.id = pr.order_id
      JOIN public.kanban_coluna kc ON kc.chave = pe.status
     WHERE pr.product_id = v_product_id
       AND pr.delivery_date = v_date
       AND NOT kc.is_cancelled;

    IF v_capacity IS NULL OR v_used + v_qty > v_capacity THEN
      RAISE EXCEPTION 'PREORDER_CAPACITY_EXCEEDED' USING ERRCODE = 'check_violation',
        DETAIL = format('Capacidade do dia %s esgotada (%s/%s).', v_date, v_used, v_capacity);
    END IF;

    INSERT INTO public.preorders (order_id, product_id, delivery_date, quantity, unit, rules_snapshot)
    VALUES (
      p_order_id,
      v_product_id,
      v_date,
      v_qty,
      COALESCE(v_produto.unidade_medida::text, 'unidade'),
      v_cfg || jsonb_build_object('unit_price', v_produto.unit_price, 'daily_capacity', v_capacity)
    );
  END LOOP;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.reserve_preorders(uuid, jsonb) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.reserve_preorders(uuid, jsonb) TO service_role;

COMMIT;

-- =====================================================================================
-- DOWN (rollback manual):
--   -- reaplicar o corpo da migration 111 em reserve_preorders (lendo
--   -- v_capacity de preorder_config->>'daily_capacity' de novo);
--   UPDATE public.produtos
--      SET preorder_config = preorder_config || jsonb_build_object('daily_capacity', producao_diaria_limite)
--    WHERE product_type = 'preorder';
-- =====================================================================================
