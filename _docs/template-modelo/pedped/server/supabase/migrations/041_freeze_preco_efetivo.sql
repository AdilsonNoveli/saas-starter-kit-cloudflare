-- =====================================================================================
-- MIGRATION: freeze_product_info congela o PREÇO EFETIVO (promocional quando houver)
-- Versão: 041
-- Descrição: O trigger `trg_freeze_product_info` (BEFORE INSERT em itens_pedido)
--            congelava `preco_unitario_congelado = preco_venda`, ignorando
--            `preco_promocional`. Resultado: o preço promocional manual era exibido
--            no catálogo/PDV mas NUNCA cobrado (o item era gravado a preço cheio).
--            Passa a congelar `COALESCE(preco_promocional, preco_venda)` — mesma
--            fonte de verdade de getEffectivePrice() no client. Vale para todos os
--            canais (catálogo, PDV, WhatsApp), pois todos inserem itens_pedido sem
--            informar o preço e dependem deste trigger.
--
--            Sem duplo desconto: `desconto_aplicado` (applyPromotions) cobre apenas
--            promoções por REGRA (leve/pague, progressivo, carrinho), calculadas
--            sobre o preço efetivo — o preço promocional manual não entra ali.
-- =====================================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.freeze_product_info()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public', 'pg_catalog'
AS $$
DECLARE
  v_nome  text;
  v_preco numeric;
BEGIN
  -- Preço vigente = promocional quando definido, senão o preço de venda.
  SELECT nome, COALESCE(preco_promocional, preco_venda) INTO v_nome, v_preco
  FROM public.produtos WHERE id = NEW.produto_id;

  NEW.nome_produto_congelado  = v_nome;
  NEW.preco_unitario_congelado = v_preco;
  RETURN NEW;
END;
$$;

COMMIT;
