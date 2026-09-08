-- =====================================================================================
-- MIGRATION: Remove o modo de venda 'both' — produto é 'stock' OU 'preorder'
-- Versão: 079
-- =====================================================================================
-- CONTEXTO:
--   Decisão de produto: não existe venda híbrida. Um produto ou é venda
--   imediata ('stock') ou é encomenda ('preorder'). Simplifica o catálogo
--   (CTA único), o modal (sem toggle de modo) e as validações.
--
--   Nenhuma linha usa 'both' em produção (a feature não foi lançada com esse
--   modo); o UPDATE defensivo abaixo garante a migração segura mesmo assim.
--
--   A RPC reserve_preorders passa a aceitar apenas product_type = 'preorder'.
--
-- IDEMPOTÊNCIA: DROP/ADD de constraint com IF EXISTS; UPDATE é inócuo ao repetir.
-- =====================================================================================

BEGIN;

-- Defensivo: qualquer 'both' residual vira 'preorder' (mantém a encomenda ativa).
UPDATE public.produtos SET product_type = 'preorder' WHERE product_type = 'both';

ALTER TABLE public.produtos DROP CONSTRAINT IF EXISTS produtos_product_type_check;
ALTER TABLE public.produtos ADD CONSTRAINT produtos_product_type_check
  CHECK (product_type IN ('stock','preorder'));

COMMENT ON COLUMN public.produtos.product_type IS
  'Modo de venda: stock (imediata) OU preorder (encomenda). Default stock preserva o catálogo existente.';

-- reserve_preorders: alinhado ao novo contrato (somente 'preorder').
-- Recriada por inteiro (mesmo corpo da 078, com a checagem de tipo ajustada).
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

    SELECT id, product_type, preorder_config, unidade_medida,
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
    v_capacity := (v_cfg->>'daily_capacity')::numeric;
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
      v_cfg || jsonb_build_object('unit_price', v_produto.unit_price)
    );
  END LOOP;
END;
$$;

COMMIT;

-- =====================================================================================
-- DOWN (rollback manual):
--
-- BEGIN;
-- ALTER TABLE public.produtos DROP CONSTRAINT IF EXISTS produtos_product_type_check;
-- ALTER TABLE public.produtos ADD CONSTRAINT produtos_product_type_check
--   CHECK (product_type IN ('stock','preorder','both'));
-- -- Restaurar reserve_preorders com product_type IN ('preorder','both')
-- -- (reaplicar a definição da migration 078).
-- COMMIT;
-- =====================================================================================
