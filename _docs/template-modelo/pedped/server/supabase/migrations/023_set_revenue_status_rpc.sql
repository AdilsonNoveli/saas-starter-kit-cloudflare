-- =====================================================================================
-- MIGRATION: RPC set_revenue_status — altera qual coluna kanban dispara faturamento
-- Versão: 023
-- Contexto: O dashboard expõe um dropdown para o admin escolher o status de receita
--   sem precisar ir nas configurações do kanban. A RPC garante atomicidade:
--   desliga is_revenue_trigger em todas as colunas e liga apenas na escolhida.
--   Se a coluna for excluída antes de o admin trocar, o faturamento cai para 0
--   e o dropdown mostra as colunas restantes para re-seleção.
-- =====================================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.set_revenue_status(p_chave text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  -- Valida que a coluna existe antes de alterar qualquer linha
  IF NOT EXISTS (SELECT 1 FROM public.kanban_coluna WHERE chave = p_chave) THEN
    RAISE EXCEPTION 'Coluna kanban "%" não encontrada.', p_chave;
  END IF;

  -- Atualização atômica: desliga todas, liga a escolhida
  UPDATE public.kanban_coluna
  SET is_revenue_trigger = (chave = p_chave);
END;
$$;

COMMENT ON FUNCTION public.set_revenue_status(text) IS
'Define qual coluna kanban dispara o faturamento. Operação atômica: garante exatamente 1 coluna ativa.';

REVOKE EXECUTE ON FUNCTION public.set_revenue_status(text) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.set_revenue_status(text) TO authenticated;

COMMIT;
