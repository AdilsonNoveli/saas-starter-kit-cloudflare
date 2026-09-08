-- =====================================================================================
-- MIGRATION: Atribuição automática de entregador (fila + concorrência)
-- Versão: 016
-- Fase do Plano: 6.3
-- Descrição:
--   - assign_order_driver(p_pedido_id): seleciona ATOMICAMENTE um entregador
--     livre (lock + SKIP LOCKED, sem dupla atribuição), grava
--     entregador_id/atribuido_em e move o pedido 'preparado' -> 'saiu_para_entrega'.
--     Aplica-se apenas a pedidos de entrega ainda não atribuídos. Retorna o
--     entregador atribuído (ou NULL se não houver entregador disponível).
--   - reevaluate_delivery_queue(): pega o pedido pendente mais antigo
--     (preparado + entrega + sem entregador) e tenta atribuí-lo. Chamada
--     quando um entregador é liberado (entrega concluída). Retorna o pedido
--     atribuído (ou NULL).
-- Pré-requisitos: 003 (usuarios), 006 (histórico/entregue_em), 010 (entregador_id),
--                 015 (status como text + FK kanban_coluna).
-- Decisão: sem etapa de "aceite" do entregador (6.3) — interação via WhatsApp/n8n.
-- =====================================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.assign_order_driver(p_pedido_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_driver_id uuid;
  v_tipo_entrega text;
  v_status text;
BEGIN
  -- Trava o pedido alvo e valida pré-condições (entrega + preparado).
  SELECT tipo_entrega, status INTO v_tipo_entrega, v_status
  FROM public.pedidos
  WHERE id = p_pedido_id
  FOR UPDATE;

  IF v_tipo_entrega IS DISTINCT FROM 'entrega' OR v_status IS DISTINCT FROM 'preparado' THEN
    RETURN NULL;
  END IF;

  -- Seleciona um entregador livre, travando a linha para evitar que outra
  -- transição concorrente escolha o mesmo entregador (SKIP LOCKED).
  SELECT u.id INTO v_driver_id
  FROM public.usuarios u
  WHERE u.role = 'entregador'
    AND u.ativo = true
    AND NOT EXISTS (
      SELECT 1 FROM public.pedidos p
      WHERE p.entregador_id = u.id AND p.status = 'saiu_para_entrega'
    )
  ORDER BY u.atualizado_em ASC
  LIMIT 1
  FOR UPDATE OF u SKIP LOCKED;

  IF v_driver_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Marca a origem desta transição automática para o histórico (trigger 006).
  PERFORM set_config('app.origem', 'sistema', true);

  UPDATE public.pedidos
  SET entregador_id = v_driver_id,
      atribuido_em = now(),
      status = 'saiu_para_entrega'
  WHERE id = p_pedido_id
    AND entregador_id IS NULL
    AND status = 'preparado';

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  RETURN v_driver_id;
END;
$$;

COMMENT ON FUNCTION public.assign_order_driver(uuid) IS
'Atribui atomicamente um entregador livre ao pedido e move para saiu_para_entrega. Retorna o entregador ou NULL.';

CREATE OR REPLACE FUNCTION public.reevaluate_delivery_queue()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_order_id uuid;
  v_driver_id uuid;
BEGIN
  -- Pedido pendente mais antigo aguardando entregador.
  SELECT id INTO v_order_id
  FROM public.pedidos
  WHERE status = 'preparado'
    AND tipo_entrega = 'entrega'
    AND entregador_id IS NULL
  ORDER BY criado_em ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  IF v_order_id IS NULL THEN
    RETURN NULL;
  END IF;

  v_driver_id := public.assign_order_driver(v_order_id);
  IF v_driver_id IS NULL THEN
    RETURN NULL;
  END IF;

  RETURN v_order_id;
END;
$$;

COMMENT ON FUNCTION public.reevaluate_delivery_queue() IS
'Atribui o pedido pendente mais antigo (preparado+entrega) a um entregador livre. Retorna o pedido atribuído ou NULL.';

REVOKE EXECUTE ON FUNCTION public.assign_order_driver(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.reevaluate_delivery_queue() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.assign_order_driver(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.reevaluate_delivery_queue() TO authenticated, service_role;

COMMIT;
