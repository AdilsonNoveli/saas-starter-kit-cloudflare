-- =====================================================================================
-- MIGRATION: create_integration_order preserva fulfillment por-item (Feature 4.1)
-- Versão: 086
-- =====================================================================================
-- CONTEXTO:
--   `p_itens` já pode carregar `delivery_mode`/`address_id` por item (definidos
--   via DefinirItemCarrinho quando divergem do padrão do carrinho — migration
--   085). Esta migration só estende o INSERT em `itens_pedido` para preservar
--   esse override no pedido final; ausente no item = NULL = herda
--   pedidos.tipo_entrega/endereco_id (resolução de nível, Feature 4.1).
--
--   Mesma assinatura (sem novo parâmetro) — CREATE OR REPLACE substitui só o corpo.
-- =====================================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.create_integration_order(
  p_idempotency_key   text,
  p_cliente_id        uuid,
  p_tipo_entrega      public.tipo_entrega_enum,
  p_forma_pagamento   public.forma_pagamento_enum,
  p_status            text,
  p_itens             jsonb,
  p_endereco_id       uuid    DEFAULT NULL,
  p_endereco_novo     jsonb   DEFAULT NULL,
  p_sessao_id         uuid    DEFAULT NULL,
  p_observacoes       text    DEFAULT NULL,
  p_nota_operacional  text    DEFAULT NULL,
  p_desconto_aplicado numeric DEFAULT 0,
  p_valor_entrega     numeric DEFAULT 0,
  p_frete_gratis      boolean DEFAULT false,
  p_preorder_items    jsonb   DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path TO 'public', 'pg_catalog'
AS $function$
DECLARE
  v_inserted    integer;
  v_existing    text;
  v_endereco_id uuid := p_endereco_id;
  v_pedido_id   uuid;
  v_subtotal    numeric;
  v_total       numeric;
  v_has_key     boolean := p_idempotency_key IS NOT NULL AND p_idempotency_key <> '';
BEGIN
  IF v_has_key THEN
    INSERT INTO public.integration_idempotency (key, status, payload)
    VALUES (p_idempotency_key, 'processing', NULL)
    ON CONFLICT (key) DO NOTHING;
    GET DIAGNOSTICS v_inserted = ROW_COUNT;

    IF v_inserted = 0 THEN
      SELECT payload->>'pedido_id' INTO v_existing
      FROM public.integration_idempotency
      WHERE key = p_idempotency_key;

      IF v_existing IS NOT NULL THEN
        SELECT valor_subtotal, valor_total INTO v_subtotal, v_total
        FROM public.pedidos WHERE id = v_existing::uuid;
        RETURN jsonb_build_object(
          'outcome', 'replay',
          'pedido_id', v_existing,
          'subtotal', COALESCE(v_subtotal, 0),
          'total', COALESCE(v_total, 0)
        );
      END IF;

      RETURN jsonb_build_object('outcome', 'in_flight');
    END IF;
  END IF;

  IF p_endereco_novo IS NOT NULL THEN
    INSERT INTO public.enderecos_cliente (
      cliente_id, rua, numero, bairro, complemento, cidade, estado, cep, latitude, longitude
    )
    VALUES (
      p_cliente_id,
      p_endereco_novo->>'rua',
      p_endereco_novo->>'numero',
      p_endereco_novo->>'bairro',
      p_endereco_novo->>'complemento',
      p_endereco_novo->>'cidade',
      p_endereco_novo->>'estado',
      p_endereco_novo->>'cep',
      (p_endereco_novo->>'latitude')::numeric,
      (p_endereco_novo->>'longitude')::numeric
    )
    RETURNING id INTO v_endereco_id;
  END IF;

  INSERT INTO public.pedidos (
    cliente_id, sessao_id, endereco_id, tipo_entrega, forma_pagamento,
    observacoes, status, nota_operacional, desconto_aplicado, valor_entrega,
    frete_gratis_aplicado
  )
  VALUES (
    p_cliente_id, p_sessao_id, v_endereco_id, p_tipo_entrega, p_forma_pagamento,
    p_observacoes, p_status, p_nota_operacional, COALESCE(p_desconto_aplicado, 0),
    COALESCE(p_valor_entrega, 0), COALESCE(p_frete_gratis, false)
  )
  RETURNING id INTO v_pedido_id;

  -- Fulfillment por-item (Feature 4.1): delivery_mode/address_id no item jsonb
  -- SÓ quando diverge do padrão do carrinho; ausente = NULL = herda o pedido.
  INSERT INTO public.itens_pedido (pedido_id, produto_id, quantidade, delivery_mode, endereco_id)
  SELECT
    v_pedido_id,
    (item->>'produto_id')::uuid,
    (item->>'quantidade')::numeric,
    NULLIF(item->>'delivery_mode', ''),
    NULLIF(item->>'address_id', '')::uuid
  FROM jsonb_array_elements(p_itens) AS item;

  IF p_preorder_items IS NOT NULL
     AND jsonb_typeof(p_preorder_items) = 'array'
     AND jsonb_array_length(p_preorder_items) > 0 THEN
    PERFORM public.reserve_preorders(v_pedido_id, p_preorder_items);
  END IF;

  IF v_has_key THEN
    UPDATE public.integration_idempotency
    SET status = 'completed', payload = jsonb_build_object('pedido_id', v_pedido_id)
    WHERE key = p_idempotency_key;
  END IF;

  IF p_sessao_id IS NOT NULL THEN
    UPDATE public.sessoes SET status = 'convertida' WHERE id = p_sessao_id;
    DELETE FROM public.cart_items WHERE sessao_id = p_sessao_id;
  END IF;

  SELECT valor_subtotal, valor_total INTO v_subtotal, v_total
  FROM public.pedidos WHERE id = v_pedido_id;

  RETURN jsonb_build_object(
    'outcome', 'created',
    'pedido_id', v_pedido_id,
    'subtotal', COALESCE(v_subtotal, 0),
    'total', COALESCE(v_total, 0)
  );
END;
$function$;

COMMIT;

-- =====================================================================================
-- DOWN (rollback manual): reaplicar o corpo da migration 080 (sem delivery_mode/
-- endereco_id no INSERT de itens_pedido).
-- =====================================================================================
