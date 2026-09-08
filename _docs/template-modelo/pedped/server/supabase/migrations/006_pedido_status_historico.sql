-- =====================================================================================
-- MIGRATION: Histórico de status de pedidos + entregue_em
-- Versão: 006
-- Fase do Plano: 2.4
-- Descrição:
--   - Adiciona pedidos.entregue_em (preenchido quando status='entregue').
--   - Cria pedido_status_historico (auditoria de transição de status).
--   - Trigger AFTER UPDATE OF status ON pedidos:
--       * registra a transição em pedido_status_historico
--       * seta/limpa entregue_em automaticamente
--   - Cria índice por entregue_em (faturamento diário).
-- =====================================================================================

BEGIN;

-- 1) Coluna entregue_em
ALTER TABLE public.pedidos
  ADD COLUMN IF NOT EXISTS entregue_em timestamptz;

COMMENT ON COLUMN public.pedidos.entregue_em IS
'Timestamp do momento em que o pedido transitou para status=''entregue''. Preenchido por trigger.';

CREATE INDEX IF NOT EXISTS idx_pedidos_entregue_em
ON public.pedidos (entregue_em)
WHERE entregue_em IS NOT NULL;

-- 2) Tabela de histórico
CREATE TABLE IF NOT EXISTS public.pedido_status_historico (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id uuid NOT NULL REFERENCES public.pedidos(id) ON DELETE CASCADE,
  status_anterior status_pedido_enum,
  status_novo status_pedido_enum NOT NULL,
  alterado_por uuid REFERENCES public.usuarios(id) ON DELETE SET NULL,
  origem text NOT NULL DEFAULT 'sistema'
    CHECK (origem IN ('admin','webhook','sistema','catalogo','integracao')),
  criado_em timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.pedido_status_historico IS
'Auditoria de transições de status do pedido. Uma linha por mudança.';

CREATE INDEX IF NOT EXISTS idx_pedido_status_historico_pedido
ON public.pedido_status_historico (pedido_id, criado_em);

-- 3) RLS — staff lê o histórico do próprio escopo
ALTER TABLE public.pedido_status_historico ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff read pedido_status_historico" ON public.pedido_status_historico;
CREATE POLICY "Staff read pedido_status_historico" ON public.pedido_status_historico
FOR SELECT USING (public.is_staff());

-- Inserção é feita pelo trigger (SECURITY DEFINER) — não precisa de policy de INSERT.

-- 4) Trigger de auditoria + entregue_em
CREATE OR REPLACE FUNCTION public.log_pedido_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  -- Só processa quando há mudança real de status
  IF OLD.status IS DISTINCT FROM NEW.status THEN

    -- Atualiza entregue_em conforme transição
    IF NEW.status = 'entregue' AND NEW.entregue_em IS NULL THEN
      NEW.entregue_em := now();
    ELSIF NEW.status <> 'entregue' AND OLD.entregue_em IS NOT NULL THEN
      -- Se o pedido for revertido (ex.: cancelado após entregue) limpa o timestamp
      NEW.entregue_em := NULL;
    END IF;

    -- Registra histórico
    INSERT INTO public.pedido_status_historico (
      pedido_id, status_anterior, status_novo, alterado_por, origem
    ) VALUES (
      NEW.id,
      OLD.status,
      NEW.status,
      auth.uid(),
      COALESCE(current_setting('app.origem', true), 'sistema')
    );
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.log_pedido_status_change() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_log_pedido_status ON public.pedidos;
CREATE TRIGGER trg_log_pedido_status
BEFORE UPDATE OF status ON public.pedidos
FOR EACH ROW EXECUTE FUNCTION public.log_pedido_status_change();

-- 5) Bootstrap: registra estado inicial de pedidos pré-existentes (idempotente)
INSERT INTO public.pedido_status_historico (pedido_id, status_anterior, status_novo, origem)
SELECT p.id, NULL, p.status, 'sistema'
FROM public.pedidos p
WHERE NOT EXISTS (
  SELECT 1 FROM public.pedido_status_historico h WHERE h.pedido_id = p.id
);

-- 6) Backfill de entregue_em para pedidos já entregues sem timestamp
UPDATE public.pedidos
   SET entregue_em = atualizado_em
 WHERE status = 'entregue' AND entregue_em IS NULL;

COMMIT;
