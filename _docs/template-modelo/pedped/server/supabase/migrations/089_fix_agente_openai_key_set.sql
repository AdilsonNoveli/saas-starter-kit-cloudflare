-- =====================================================================================
-- MIGRATION: Corrige agente_openai_key_set (bug de sintaxe SQL, migration 088)
-- Versão: 089
-- =====================================================================================
-- CONTEXTO: `vault.create_secret(new_secret, new_name, ...)` retorna um
-- escalar `uuid`, não uma tabela. A versão original (088) fazia
-- `SELECT id INTO v_new_id FROM vault.create_secret(...)` — usar uma função
-- escalar em FROM produz uma relação de UMA coluna cujo nome é o da própria
-- função (`create_secret`), nunca `id`; a query falhava com
-- `column "id" does not exist` toda vez que a chave era salva pela primeira
-- vez (agente_openai_key_id ainda NULL), sempre que POST
-- /api/admin/integrations/openai-key era chamado — 500 em toda tentativa.
--
-- `CREATE OR REPLACE FUNCTION` — idempotente, seguro rodar de novo; só troca
-- a atribuição por chamada direta da função (`v_new_id := vault.create_secret(...)`),
-- sem o truque de FROM. Resto da função (branch de update, REVOKE/GRANT)
-- idêntico à 088, repetido aqui só porque CREATE OR REPLACE reescreve o corpo
-- inteiro.
-- =====================================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.agente_openai_key_set(p_key text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog', 'vault'
AS $function$
DECLARE
  v_existing_id uuid;
  v_new_id uuid;
BEGIN
  SELECT agente_openai_key_id INTO v_existing_id FROM public.loja LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    PERFORM vault.update_secret(v_existing_id, p_key);
    RETURN v_existing_id;
  END IF;

  v_new_id := vault.create_secret(p_key, 'loja_openai_key');
  UPDATE public.loja SET agente_openai_key_id = v_new_id;
  RETURN v_new_id;
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.agente_openai_key_set(text) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.agente_openai_key_set(text) TO service_role;

COMMIT;

-- =====================================================================================
-- DOWN (rollback manual): não aplicável — reverter recriaria o bug da 088.
-- Se necessário reverter a feature inteira, use o DOWN documentado na 088.
-- =====================================================================================
