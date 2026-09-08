-- =====================================================================================
-- MIGRATION: Integração inbound — idempotência + confirmação de entrega
-- Versão: 017
-- Fase do Plano: 6.4
-- Descrição:
--   - integration_idempotency: mapeia idempotency_key -> pedido, evitando
--     duplicidade em retries do n8n em POST /api/integration/v1/orders.
--   - confirm_delivery_inbound(pedido, whatsapp): valida atomicamente que o
--     pedido está em 'saiu_para_entrega' e que o whatsapp informado bate com
--     o entregador atribuído; marca 'entregue' (origem='integracao' p/ histórico).
-- =====================================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.integration_idempotency (
  idempotency_key text PRIMARY KEY,
  pedido_id uuid REFERENCES public.pedidos(id) ON DELETE SET NULL,
  criado_em timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.integration_idempotency IS
'Mapeia Idempotency-Key -> pedido criado, evitando duplicidade em retries da integração inbound (6.4).';

-- Acesso exclusivo via service role (backend). Sem policies = bloqueado para
-- anon/authenticated; o service role faz bypass de RLS.
ALTER TABLE public.integration_idempotency ENABLE ROW LEVEL SECURITY;

-- Confirmação de entrega validada pelo whatsapp do entregador atribuído.
-- Normaliza os números (apenas dígitos) antes de comparar.
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
'Marca o pedido como entregue validando o whatsapp do entregador atribuído (integração inbound 6.4).';

REVOKE EXECUTE ON FUNCTION public.confirm_delivery_inbound(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.confirm_delivery_inbound(uuid, text) TO service_role;

COMMIT;
