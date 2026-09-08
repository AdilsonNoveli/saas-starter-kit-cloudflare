-- Substituição da função increment_cupom_uso por uma versão atômica que
-- valida E incrementa em um único UPDATE, eliminando a race condition TOCTOU
-- onde duas requisições simultâneas poderiam validar o mesmo cupom antes de
-- qualquer uma incrementar o contador.

BEGIN;

-- Função atômica: valida todas as condições do cupom E incrementa uso_atual
-- em um único statement SQL (UPDATE ... RETURNING). Retorna desconto calculado
-- ou zero linhas quando o cupom não é válido / foi esgotado.
CREATE OR REPLACE FUNCTION public.claim_cupom_atomico(
  p_codigo   text,
  p_subtotal numeric
)
RETURNS TABLE(cupom_id uuid, desconto numeric)
LANGUAGE sql
SECURITY INVOKER
SET search_path TO 'public', 'pg_catalog'
AS $$
  UPDATE public.cupons
  SET uso_atual = uso_atual + 1
  WHERE codigo   = upper(p_codigo)
    AND ativo    = true
    AND (uso_maximo IS NULL OR uso_atual < uso_maximo)
    AND (data_inicio IS NULL OR data_inicio <= now())
    AND (data_fim    IS NULL OR data_fim    >= now())
    AND p_subtotal >= valor_minimo
  RETURNING
    id AS cupom_id,
    CASE tipo_desconto
      WHEN 'percentual' THEN round(p_subtotal * valor / 100.0, 2)
      ELSE least(valor, p_subtotal)
    END AS desconto;
$$;

-- Decrementa uso_atual como rollback quando a criação do pedido falha após o
-- cupom já ter sido reivindicado (best-effort; não rebaixa abaixo de 0).
CREATE OR REPLACE FUNCTION public.decrement_cupom_uso(p_cupom_id uuid)
RETURNS void
LANGUAGE sql
SECURITY INVOKER
SET search_path TO 'public', 'pg_catalog'
AS $$
  UPDATE public.cupons
  SET uso_atual = GREATEST(uso_atual - 1, 0)
  WHERE id = p_cupom_id;
$$;

-- Apenas service_role invoca estas funções; clientes não têm acesso direto.
REVOKE EXECUTE ON FUNCTION public.claim_cupom_atomico(text, numeric) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.decrement_cupom_uso(uuid)           FROM PUBLIC, anon, authenticated;

COMMIT;
