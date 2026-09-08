-- =====================================================================================
-- MIGRATION: Kanban à prova de falhas — colunas de sistema protegidas +
--            automação de entrega flag-driven (elimina chaves hardcoded)
-- Versão: 060
-- =====================================================================================
-- 1) Adiciona flags: is_sistema (proteção) e papéis de entrega
--    (is_delivery_dispatch/is_out_for_delivery/is_delivered).
-- 2) Marca as 7 colunas canônicas como sistema e mapeia os papéis de entrega.
--    NÃO toca em is_revenue_trigger (config de runtime via set_revenue_status).
-- 3) Índices únicos parciais: no máximo UMA coluna por papel de valor único.
-- 4) Trigger guard_system_kanban_coluna: bloqueia exclusão de coluna de sistema
--    (mesmo vazia) e renome/desproteção da chave/is_sistema.
-- 5) Reescreve a automação (assign_order_driver, reevaluate_delivery_queue,
--    confirm_delivery_inbound) e os triggers de status (update_client_metrics,
--    log_pedido_status_change) para resolver os estados por FLAG, sem hardcode.
-- =====================================================================================

BEGIN;

-- 1) Colunas de flag ------------------------------------------------------------
ALTER TABLE public.kanban_coluna ADD COLUMN IF NOT EXISTS is_sistema           boolean NOT NULL DEFAULT false;
ALTER TABLE public.kanban_coluna ADD COLUMN IF NOT EXISTS is_delivery_dispatch boolean NOT NULL DEFAULT false;
ALTER TABLE public.kanban_coluna ADD COLUMN IF NOT EXISTS is_out_for_delivery  boolean NOT NULL DEFAULT false;
ALTER TABLE public.kanban_coluna ADD COLUMN IF NOT EXISTS is_delivered         boolean NOT NULL DEFAULT false;

-- 2) Marca canônicas como sistema + mapeia papéis de entrega (idempotente).
--    is_revenue_trigger é preservado de propósito (não aparece aqui).
UPDATE public.kanban_coluna
  SET is_sistema = true
  WHERE chave IN ('pendente','confirmado','em_preparo','preparado','saiu_para_entrega','entregue','cancelado');

UPDATE public.kanban_coluna SET is_delivery_dispatch = (chave = 'preparado')
  WHERE is_delivery_dispatch IS DISTINCT FROM (chave = 'preparado');
UPDATE public.kanban_coluna SET is_out_for_delivery = (chave = 'saiu_para_entrega')
  WHERE is_out_for_delivery IS DISTINCT FROM (chave = 'saiu_para_entrega');
UPDATE public.kanban_coluna SET is_delivered = (chave = 'entregue')
  WHERE is_delivered IS DISTINCT FROM (chave = 'entregue');

-- 3) Índices únicos parciais: no máximo uma coluna por papel (is_open é multi).
CREATE UNIQUE INDEX IF NOT EXISTS kanban_coluna_uniq_revenue_trigger
  ON public.kanban_coluna (is_revenue_trigger) WHERE is_revenue_trigger;
CREATE UNIQUE INDEX IF NOT EXISTS kanban_coluna_uniq_cancelled
  ON public.kanban_coluna (is_cancelled) WHERE is_cancelled;
CREATE UNIQUE INDEX IF NOT EXISTS kanban_coluna_uniq_delivery_dispatch
  ON public.kanban_coluna (is_delivery_dispatch) WHERE is_delivery_dispatch;
CREATE UNIQUE INDEX IF NOT EXISTS kanban_coluna_uniq_out_for_delivery
  ON public.kanban_coluna (is_out_for_delivery) WHERE is_out_for_delivery;
CREATE UNIQUE INDEX IF NOT EXISTS kanban_coluna_uniq_delivered
  ON public.kanban_coluna (is_delivered) WHERE is_delivered;

-- 4) Guarda de colunas de sistema ----------------------------------------------
CREATE OR REPLACE FUNCTION public.guard_system_kanban_coluna()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_catalog
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.is_sistema THEN
      RAISE EXCEPTION 'A coluna de sistema "%" não pode ser excluída.', OLD.label
        USING ERRCODE = 'restrict_violation';
    END IF;
    RETURN OLD;
  ELSE -- UPDATE
    IF OLD.is_sistema AND (NEW.chave IS DISTINCT FROM OLD.chave OR NEW.is_sistema = false) THEN
      RAISE EXCEPTION 'Coluna de sistema "%": a chave e o status de sistema são imutáveis.', OLD.label
        USING ERRCODE = 'restrict_violation';
    END IF;
    RETURN NEW;
  END IF;
END;
$$;

COMMENT ON FUNCTION public.guard_system_kanban_coluna() IS
'Bloqueia exclusão de colunas de sistema e renome/desproteção da chave/is_sistema. Protege a automação flag-driven contra falhas de configuração.';

REVOKE EXECUTE ON FUNCTION public.guard_system_kanban_coluna() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_guard_system_kanban_coluna_del ON public.kanban_coluna;
CREATE TRIGGER trg_guard_system_kanban_coluna_del
  BEFORE DELETE ON public.kanban_coluna
  FOR EACH ROW EXECUTE FUNCTION public.guard_system_kanban_coluna();

DROP TRIGGER IF EXISTS trg_guard_system_kanban_coluna_upd ON public.kanban_coluna;
CREATE TRIGGER trg_guard_system_kanban_coluna_upd
  BEFORE UPDATE ON public.kanban_coluna
  FOR EACH ROW EXECUTE FUNCTION public.guard_system_kanban_coluna();

-- 5) Automação flag-driven ------------------------------------------------------

-- 5a) update_client_metrics: métricas do cliente por is_delivered/is_cancelled.
CREATE OR REPLACE FUNCTION public.update_client_metrics()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_catalog
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    IF EXISTS (SELECT 1 FROM public.kanban_coluna WHERE chave = NEW.status AND is_delivered) THEN
      UPDATE public.clientes
      SET total_pedidos          = total_pedidos + 1,
          valor_gasto_acumulado  = valor_gasto_acumulado + NEW.valor_total,
          ultimo_pedido_em       = now(),
          frequencia_compra      = public.calculate_frequencia_compra(NEW.cliente_id)
      WHERE id = NEW.cliente_id;
    END IF;

    IF EXISTS (SELECT 1 FROM public.kanban_coluna WHERE chave = NEW.status AND is_cancelled) THEN
      UPDATE public.clientes
      SET total_cancelamentos = total_cancelamentos + 1
      WHERE id = NEW.cliente_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- 5b) log_pedido_status_change: entregue_em derivado de is_delivered.
CREATE OR REPLACE FUNCTION public.log_pedido_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN

    IF EXISTS (SELECT 1 FROM public.kanban_coluna WHERE chave = NEW.status AND is_delivered) THEN
      IF NEW.entregue_em IS NULL THEN
        NEW.entregue_em := now();
      END IF;
    ELSIF OLD.entregue_em IS NOT NULL THEN
      NEW.entregue_em := NULL;
    END IF;

    INSERT INTO public.pedido_status_historico (
      pedido_id, status_anterior, status_novo, alterado_por, origem
    ) VALUES (
      NEW.id, OLD.status, NEW.status, auth.uid(),
      COALESCE(current_setting('app.origem', true), 'sistema')
    );
  END IF;

  RETURN NEW;
END;
$$;

-- 5c) assign_order_driver: papéis de entrega por flag.
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
  v_dispatch text;
  v_out text;
BEGIN
  SELECT chave INTO v_dispatch FROM public.kanban_coluna WHERE is_delivery_dispatch LIMIT 1;
  SELECT chave INTO v_out      FROM public.kanban_coluna WHERE is_out_for_delivery  LIMIT 1;
  IF v_dispatch IS NULL OR v_out IS NULL THEN
    RAISE EXCEPTION 'Fluxo de entrega não configurado: defina colunas is_delivery_dispatch e is_out_for_delivery em kanban_coluna.';
  END IF;

  SELECT tipo_entrega, status INTO v_tipo_entrega, v_status
  FROM public.pedidos
  WHERE id = p_pedido_id
  FOR UPDATE;

  IF v_tipo_entrega IS DISTINCT FROM 'entrega' OR v_status IS DISTINCT FROM v_dispatch THEN
    RETURN NULL;
  END IF;

  SELECT u.id INTO v_driver_id
  FROM public.usuarios u
  WHERE u.role = 'entregador'
    AND u.ativo = true
    AND NOT EXISTS (
      SELECT 1 FROM public.pedidos p
      WHERE p.entregador_id = u.id AND p.status = v_out
    )
  ORDER BY u.atualizado_em ASC
  LIMIT 1
  FOR UPDATE OF u SKIP LOCKED;

  IF v_driver_id IS NULL THEN
    RETURN NULL;
  END IF;

  PERFORM set_config('app.origem', 'sistema', true);

  UPDATE public.pedidos
  SET entregador_id = v_driver_id,
      atribuido_em = now(),
      status = v_out
  WHERE id = p_pedido_id
    AND entregador_id IS NULL
    AND status = v_dispatch;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  RETURN v_driver_id;
END;
$$;

-- 5d) reevaluate_delivery_queue: coluna de despacho por flag.
CREATE OR REPLACE FUNCTION public.reevaluate_delivery_queue()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_order_id uuid;
  v_driver_id uuid;
  v_dispatch text;
BEGIN
  SELECT chave INTO v_dispatch FROM public.kanban_coluna WHERE is_delivery_dispatch LIMIT 1;
  IF v_dispatch IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT id INTO v_order_id
  FROM public.pedidos
  WHERE status = v_dispatch
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

-- 5e) confirm_delivery_inbound: is_out_for_delivery -> is_delivered.
CREATE OR REPLACE FUNCTION public.confirm_delivery_inbound(p_pedido_id uuid, p_whatsapp text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_valid boolean;
  v_normalized text := regexp_replace(COALESCE(p_whatsapp, ''), '\D', '', 'g');
  v_out text;
  v_delivered text;
BEGIN
  IF v_normalized = '' THEN
    RETURN false;
  END IF;

  SELECT chave INTO v_out       FROM public.kanban_coluna WHERE is_out_for_delivery LIMIT 1;
  SELECT chave INTO v_delivered FROM public.kanban_coluna WHERE is_delivered        LIMIT 1;
  IF v_out IS NULL OR v_delivered IS NULL THEN
    RETURN false;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.pedidos p
    JOIN public.usuarios u ON u.id = p.entregador_id
    WHERE p.id = p_pedido_id
      AND p.status = v_out
      AND regexp_replace(COALESCE(u.whatsapp, ''), '\D', '', 'g') = v_normalized
  ) INTO v_valid;

  IF NOT v_valid THEN
    RETURN false;
  END IF;

  PERFORM set_config('app.origem', 'integracao', true);

  UPDATE public.pedidos
  SET status = v_delivered
  WHERE id = p_pedido_id AND status = v_out;

  RETURN FOUND;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.assign_order_driver(uuid)            FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.assign_order_driver(uuid)            TO service_role;
REVOKE EXECUTE ON FUNCTION public.reevaluate_delivery_queue()         FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.reevaluate_delivery_queue()         TO service_role;
REVOKE EXECUTE ON FUNCTION public.confirm_delivery_inbound(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.confirm_delivery_inbound(uuid, text) TO service_role;

COMMIT;
