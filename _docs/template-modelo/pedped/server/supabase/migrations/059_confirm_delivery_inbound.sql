-- =====================================================================================
-- MIGRATION: confirm_delivery_inbound (lacuna da 017 nunca aplicada em prod)
-- Versão: 059
-- =====================================================================================
-- CONTEXTO (auditoria pré-prod, 2026-07-12): a RPC confirm_delivery_inbound da
-- migration 017 NÃO existe no banco de produção (só a 016 de atribuição foi
-- aplicada manualmente). O endpoint POST /api/integration/v1/orders/confirm-delivery
-- chama esta função — sem ela, a confirmação de entrega inbound falha (500).
-- Esta migration cria a função (idempotente via CREATE OR REPLACE).
-- =====================================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.confirm_delivery_inbound(p_pedido_id uuid, p_whatsapp text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_valid boolean;
  v_normalized text := regexp_replace(COALESCE(p_whatsapp, ''), '\D', '', 'g');
BEGIN
  IF v_normalized = '' THEN
    RETURN false;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.pedidos p
    JOIN public.usuarios u ON u.id = p.entregador_id
    WHERE p.id = p_pedido_id
      AND p.status = 'saiu_para_entrega'
      AND regexp_replace(COALESCE(u.whatsapp, ''), '\D', '', 'g') = v_normalized
  ) INTO v_valid;

  IF NOT v_valid THEN
    RETURN false;
  END IF;

  PERFORM set_config('app.origem', 'integracao', true);

  UPDATE public.pedidos
  SET status = 'entregue'
  WHERE id = p_pedido_id AND status = 'saiu_para_entrega';

  RETURN FOUND;
END;
$$;

COMMENT ON FUNCTION public.confirm_delivery_inbound(uuid, text) IS
'Marca o pedido como entregue validando o whatsapp do entregador atribuído (integração inbound 6.4). Migration 017/059.';

REVOKE EXECUTE ON FUNCTION public.confirm_delivery_inbound(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.confirm_delivery_inbound(uuid, text) TO service_role;

COMMIT;
