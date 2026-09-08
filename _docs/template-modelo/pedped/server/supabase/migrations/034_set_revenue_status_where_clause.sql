-- ============================================================
-- Migration 034 — set_revenue_status: adiciona WHERE ao UPDATE
-- Bug: "UPDATE requires a WHERE clause" (HTTP 400) ao trocar o status de
-- receita no dashboard ("Faturamento Hoje"). A extensão `safeupdate` do
-- Postgres bloqueia UPDATE/DELETE sem WHERE.
-- Fix: WHERE que preserva a semântica atômica (exatamente 1 coluna ativa) e
-- só atualiza as linhas cujo valor realmente muda.
-- Idempotente (CREATE OR REPLACE). Preserva a assinatura e os grants existentes.
-- ============================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.set_revenue_status(p_chave text)
RETURNS void
LANGUAGE plpgsql
SET search_path TO 'public', 'pg_catalog'
AS $$
BEGIN
  IF NOT public.has_role(ARRAY['gerente','administrador','proprietario']::public.role_usuario_enum[]) THEN
    RAISE EXCEPTION 'Permission denied: papel gerente ou superior exigido.';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.kanban_coluna WHERE chave = p_chave) THEN
    RAISE EXCEPTION 'Coluna kanban "%" não encontrada.', p_chave;
  END IF;

  -- Atualização atômica: desliga todas, liga a escolhida.
  -- O WHERE é obrigatório (safeupdate) e evita tocar em linhas que não mudam.
  UPDATE public.kanban_coluna
  SET is_revenue_trigger = (chave = p_chave)
  WHERE is_revenue_trigger IS DISTINCT FROM (chave = p_chave);
END;
$$;

COMMIT;
