-- =====================================================================================
-- MIGRATION: agente_openai_key_delete — revogação da chave OpenAI do agente
-- Versão: 092
-- =====================================================================================
-- CONTEXTO: a seção 10 de _docs/implementar/arquitetura-agente-whatsapp-in-app.md especificou
-- escrita (`agente_openai_key_set`) e leitura (`agente_openai_key_get`), mas nunca
-- a REVOGAÇÃO — lacuna do desenho original, não decisão. Sem ela, uma chave
-- vazada só podia ser trocada por outra válida: não havia como deixar o agente
-- sem chave a partir da UI, e desligar `agente_ativo` (seção 8) não remove o
-- segredo do Vault, só para de usá-lo.
--
-- Deleta o segredo de fato (`DELETE FROM vault.secrets`) em vez de só zerar a
-- coluna: uma revogação que deixa o texto cifrado no banco não é revogação. A
-- máscara também é limpa — ela é o indicador de "há chave configurada" na UI, e
-- mantê-la mostraria uma chave que não existe mais.
--
-- SECURITY DEFINER pelo mesmo motivo de `_set`/`_get`: `vault.secrets` não é
-- acessível a `service_role` por padrão, só ao dono da função.
--
-- Idempotente por construção: sem chave configurada, é no-op e retorna false.
-- =====================================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.agente_openai_key_delete()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog', 'vault'
AS $function$
DECLARE
  v_loja_id uuid;
  v_key_id  uuid;
BEGIN
  SELECT id, agente_openai_key_id
    INTO v_loja_id, v_key_id
    FROM public.loja
   LIMIT 1;

  IF v_loja_id IS NULL THEN
    RETURN false;
  END IF;

  -- Também procura pelo nome: cobre o estado divergente (coluna zerada, segredo
  -- vivo) que `agente_openai_key_set` reconcilia — sem isto, revogar deixaria o
  -- segredo órfão para sempre. Ver migration 090.
  IF v_key_id IS NULL THEN
    SELECT id INTO v_key_id FROM vault.secrets WHERE name = 'loja_openai_key';
  END IF;

  UPDATE public.loja
     SET agente_openai_key_id = NULL,
         agente_openai_key_mascara = NULL
   WHERE id = v_loja_id;

  IF v_key_id IS NULL THEN
    RETURN false;
  END IF;

  DELETE FROM vault.secrets WHERE id = v_key_id;
  RETURN true;
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.agente_openai_key_delete() FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.agente_openai_key_delete() TO service_role;

COMMIT;

-- =====================================================================================
-- DOWN (rollback manual):
--   DROP FUNCTION IF EXISTS public.agente_openai_key_delete();
-- =====================================================================================
