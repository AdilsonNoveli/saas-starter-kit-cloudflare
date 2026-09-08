-- =====================================================================================
-- MIGRATION 069: Fix search_path mutável em garantir_unica_categoria_principal
-- =====================================================================================
-- Aviso resolvido:
--   [0011] function_search_path_mutable
--   → public.garantir_unica_categoria_principal: search_path não fixado.
--
-- Causa: a função foi criada na migration 064 sem SET search_path, deixando-a
-- vulnerável a search_path injection (um role malicioso poderia substituir
-- funções do sistema no search_path antes de chamar o trigger).
--
-- Por que SECURITY DEFINER aqui?
--   É uma função de trigger (RETURNS TRIGGER). Funções de trigger são invocadas
--   pelo sistema de triggers, não diretamente por roles. O REVOKE de anon/
--   authenticated já estava implícito (RETURNS TRIGGER não é exposta via PostgREST).
--   Mantemos SECURITY DEFINER apenas se necessário para acessar categorias com RLS;
--   na verdade, triggers BEFORE executam no contexto do role que fez o DML,
--   então SECURITY INVOKER é correto e mais seguro.
--
-- Solução: recriar com SET search_path fixo. O corpo da função é idêntico — 
-- zero alteração de comportamento.
-- =====================================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.garantir_unica_categoria_principal()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_catalog
AS $$
BEGIN
  IF NEW.principal = TRUE THEN
    UPDATE public.categorias
    SET principal = FALSE
    WHERE id <> NEW.id AND principal = TRUE;
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.garantir_unica_categoria_principal() IS
'Trigger BEFORE INSERT/UPDATE: garante no máximo uma categoria com principal=TRUE. '
'SECURITY INVOKER + search_path fixo (fix aviso 0011 do Supabase Linter).';

COMMIT;
