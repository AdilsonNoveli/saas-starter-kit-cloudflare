-- =====================================================================================
-- MIGRATION: Purga de carrinho abandonado ao expirar a sessão
-- Versão: 081
-- =====================================================================================
-- CONTEXTO:
--   As sessões nascem com TTL de 2h (SESSION_TTL_HOURS). Ao vencer, o cron
--   diário `cleanup_expired_sessions` apenas marca `status = 'expirada'` — os
--   `cart_items` da compra abandonada NUNCA eram removidos e acumulavam como
--   resíduo (o teste-via-chat.md pediu a confirmação e a correção disso).
--
--   Sessões 'convertida' já têm o carrinho limpo pela RPC de checkout
--   (create_integration_order), então o alvo real são as 'expirada'. Usamos
--   `status <> 'ativa'` por robustez (varre qualquer resíduo não-ativo).
--
--   A LINHA da sessão é preservada (auditoria/histórico); só os itens somem.
-- =====================================================================================

CREATE OR REPLACE FUNCTION public.cleanup_expired_sessions()
RETURNS TABLE(total_expired integer, execution_time timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  affected_rows integer;
BEGIN
  UPDATE public.sessoes
  SET status = 'expirada'
  WHERE status = 'ativa'
    AND expira_em <= now();

  GET DIAGNOSTICS affected_rows = ROW_COUNT;

  -- Purga o carrinho-resíduo de toda sessão que não está mais ativa.
  DELETE FROM public.cart_items ci
  USING public.sessoes s
  WHERE ci.sessao_id = s.id
    AND s.status <> 'ativa';

  RETURN QUERY
  SELECT affected_rows AS total_expired, now() AS execution_time;
END;
$$;

-- Limpeza única do passivo já acumulado (carrinhos presos a sessões não-ativas).
DELETE FROM public.cart_items ci
USING public.sessoes s
WHERE ci.sessao_id = s.id
  AND s.status <> 'ativa';
