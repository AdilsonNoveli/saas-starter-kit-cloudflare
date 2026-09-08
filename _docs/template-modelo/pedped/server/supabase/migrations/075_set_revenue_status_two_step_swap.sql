-- ============================================================
-- Migration 075 — set_revenue_status: swap em DOIS passos (fix 409 Conflict)
--
-- Bug: POST /rest/v1/rpc/set_revenue_status → 409 Conflict ao trocar o status
--   de receita no dashboard (card "Faturamento").
--
-- Causa-raiz (reproduzida em produção): a coluna `is_revenue_trigger` tem um
--   índice ÚNICO PARCIAL não-adiável — `kanban_coluna_uniq_revenue_trigger`
--   ON kanban_coluna (is_revenue_trigger) WHERE is_revenue_trigger — que garante
--   "no máximo 1 coluna com faturamento". O UPDATE de linha única
--     SET is_revenue_trigger = (chave = p_chave)
--     WHERE is_revenue_trigger IS DISTINCT FROM (chave = p_chave)
--   atualiza DUAS linhas na mesma instrução (zera a antiga, liga a nova). Como o
--   índice é verificado por-linha (immediate, não-adiável), dependendo da ordem
--   de varredura a nova linha pode virar `true` ANTES de a antiga ser zerada →
--   2 linhas `true` no mesmo instante → unique_violation (SQLSTATE 23505), que o
--   PostgREST traduz para HTTP 409.
--   (Só não falhava quando o destino era a coluna fisicamente varrida logo após
--    a atual — daí o comportamento intermitente/"às vezes funciona".)
--
-- Fix: dividir o swap em dois UPDATEs dentro da mesma transação (o corpo da
--   função já é atômico). Passo 1 zera todas (0 linhas `true` é estado válido
--   para o índice parcial); passo 2 liga apenas a escolhida. Nenhum estado
--   transitório com 2 linhas `true`. Ambos os UPDATEs têm WHERE (safeupdate ok).
--
-- Idempotente (CREATE OR REPLACE). Preserva assinatura, grants e o gate de papel.
-- ============================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.set_revenue_status(p_chave text)
RETURNS void
LANGUAGE plpgsql
SET search_path TO 'public', 'pg_catalog'
AS $$
BEGIN
  IF NOT private.has_role(ARRAY['gerente','administrador','proprietario']::public.role_usuario_enum[]) THEN
    RAISE EXCEPTION 'Permission denied: papel gerente ou superior exigido.';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.kanban_coluna WHERE chave = p_chave) THEN
    RAISE EXCEPTION 'Coluna kanban "%" não encontrada.', p_chave;
  END IF;

  -- Swap em dois passos: evita o estado transitório de 2 linhas `is_revenue_trigger`
  -- true que viola o índice único parcial não-adiável (ver cabeçalho da migration).
  UPDATE public.kanban_coluna
  SET is_revenue_trigger = false
  WHERE is_revenue_trigger;

  UPDATE public.kanban_coluna
  SET is_revenue_trigger = true
  WHERE chave = p_chave;
END;
$$;

COMMENT ON FUNCTION public.set_revenue_status(text) IS
'Define qual coluna kanban dispara o faturamento. Swap atômico em dois passos (zera todas, liga a escolhida) para respeitar o índice único parcial kanban_coluna_uniq_revenue_trigger sem violação transitória.';

COMMIT;
