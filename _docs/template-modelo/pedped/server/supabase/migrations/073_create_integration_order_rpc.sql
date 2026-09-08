-- =====================================================================================
-- MIGRATION: RPC transacional de criação de pedido da integração inbound
-- Versão: 073
-- =====================================================================================
-- CONTEXTO:
--   A criação de pedido pela integração (n8n/WhatsApp) fazia várias mutações
--   separadas (reserva de idempotência, endereço, pedido, itens, conclusão da
--   chave, conversão de sessão) como statements independentes e auto-commitados.
--   Isso deixava dois furos, ambos por falta de atomicidade:
--
--     1. Endereço órfão: em duplicatas concorrentes, o perdedor inseria endereço
--        antes de descobrir que perdeu a corrida pela chave.
--     2. Duplicata em crash: se o processo morresse entre criar o pedido e
--        concluir a chave, a reserva ficava órfã e era retomada mais tarde,
--        recriando o pedido.
--
--   Esta função move TODA a persistência para uma única transação (o corpo de
--   uma função plpgsql roda atomicamente). Consequências:
--
--     - Qualquer falha reverte tudo, INCLUSIVE a reserva da chave → uma falha de
--       validação/gravação nunca envenena a chave nem deixa lixo.
--     - `processing` só existe DENTRO da transação não-commitada. Requests
--        concorrentes bloqueiam no índice único até o vencedor commitar e então
--        leem o estado final — não há status `processing` commitado visível, o
--        que torna o "stale-takeover" desnecessário.
--     - Endereço, pedido e itens são all-or-nothing → sem órfãos, sem duplicatas.
--
--   As triggers de congelamento de preço e de cálculo de totais rodam dentro da
--   mesma transação, então o resultado é idêntico ao fluxo anterior.
--
--   Toda a lógica de negócio (validação, promoções, frete, distância) permanece
--   no backend TypeScript; a função recebe apenas valores já calculados.
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
  p_frete_gratis      boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_inserted    integer;
  v_existing    text;
  v_endereco_id uuid := p_endereco_id;
  v_pedido_id   uuid;
  v_subtotal    numeric;
  v_total       numeric;
  v_has_key     boolean := p_idempotency_key IS NOT NULL AND p_idempotency_key <> '';
BEGIN
  -- Fase 1: reserva atômica da chave. `ON CONFLICT DO NOTHING` faz o perdedor da
  -- corrida bloquear no vencedor (linha do índice único ainda não commitada);
  -- ao desbloquear, lê o estado final commitado.
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

      -- `processing` commitado sem pedido é uma reserva órfã (crash/legado do
      -- fluxo antigo). No modelo atômico não é gerada; sinalizamos em andamento.
      RETURN jsonb_build_object('outcome', 'in_flight');
    END IF;
  END IF;

  -- Endereço inline, atômico com o pedido (nada de órfão se algo falhar depois).
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

  -- Pedido — as triggers `calculate_pedido_totals` e (via itens) o recálculo de
  -- subtotal preenchem valor_subtotal/valor_total.
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

  -- Itens — `freeze_product_info` congela nome/preço; o recálculo atualiza totais.
  INSERT INTO public.itens_pedido (pedido_id, produto_id, quantidade)
  SELECT v_pedido_id, (item->>'produto_id')::uuid, (item->>'quantidade')::numeric
  FROM jsonb_array_elements(p_itens) AS item;

  -- Conclui a reserva ligando-a ao pedido — atômico com a criação.
  IF v_has_key THEN
    UPDATE public.integration_idempotency
    SET status = 'completed', payload = jsonb_build_object('pedido_id', v_pedido_id)
    WHERE key = p_idempotency_key;
  END IF;

  -- Checkout: converte a sessão e esvazia o carrinho server-side.
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
$$;

COMMENT ON FUNCTION public.create_integration_order IS
'Cria pedido da integração inbound (n8n/WhatsApp) atomicamente: reserva de idempotência + endereço + pedido + itens + conclusão da chave + conversão de sessão, tudo numa transação. Recebe valores já validados/calculados pelo backend. Retorna jsonb {outcome: created|replay|in_flight, pedido_id, subtotal, total}.';

-- Exclusivo do backend (service_role). anon/authenticated não criam pedidos de integração.
REVOKE ALL ON FUNCTION public.create_integration_order FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_integration_order TO service_role;

COMMIT;
