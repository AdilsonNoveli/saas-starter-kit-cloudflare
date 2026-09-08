-- =====================================================================================
-- MIGRATION: agente_openai_key_set — UPDATE sem WHERE + reconciliação do segredo órfão
-- Versão: 090
-- =====================================================================================
-- CONTEXTO: com a 089 aplicada (o bug de `SELECT id FROM vault.create_secret(...)`
-- já corrigido), `POST /api/admin/integrations/openai-key` continuava devolvendo
-- 500. Causa real, reproduzida contra o banco via PostgREST:
--
--   {"code":"21000","message":"UPDATE requires a WHERE clause"}
--
-- A Supabase carrega a extensão `pg-safeupdate` no role usado pelo PostgREST,
-- que aborta qualquer UPDATE/DELETE sem WHERE. `UPDATE public.loja SET
-- agente_openai_key_id = v_new_id;` (088/089) é exatamente isso — a RPC
-- abortava, a transação inteira sofria rollback (inclusive o
-- `vault.create_secret` já executado, por isso nada ficou órfão no Vault), o
-- endpoint caía no `if (setError)` e devolvia 500 em toda primeira gravação.
--
-- Não é um caso novo neste schema: `set_revenue_status` tinha o mesmo
-- `UPDATE ... SET is_revenue_trigger = (chave = p_chave);` sem WHERE e foi
-- corrigido pela 038 e depois pela 075. Esta migration fecha o último ponto.
--
-- Além do WHERE, dois endurecimentos:
--
-- 1. Reconciliação de estado divergente: `vault.secrets.name` é UNIQUE. Se
--    `loja.agente_openai_key_id` ficar NULL enquanto o segredo `loja_openai_key`
--    ainda existir (rollback parcial, restore, limpeza manual da coluna), a
--    versão anterior chamaria `create_secret` de novo e morreria com violação
--    de unicidade — 500 permanente, sem caminho de recuperação pela UI. Agora a
--    função procura o segredo pelo nome antes de criar e reaproveita o id.
-- 2. `loja` vazia deixa de virar um erro genérico: RAISE EXCEPTION com mensagem
--    explícita, em vez de um UPDATE que afeta 0 linhas e retorna sucesso falso.
--
-- `CREATE OR REPLACE FUNCTION` — idempotente, seguro rodar de novo.
-- =====================================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.agente_openai_key_set(p_key text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog', 'vault'
AS $function$
DECLARE
  v_loja_id     uuid;
  v_existing_id uuid;
  v_new_id      uuid;
BEGIN
  SELECT id, agente_openai_key_id
    INTO v_loja_id, v_existing_id
    FROM public.loja
   LIMIT 1;

  IF v_loja_id IS NULL THEN
    RAISE EXCEPTION 'Nenhuma loja cadastrada — configure a loja antes da chave OpenAI.';
  END IF;

  -- Estado divergente: coluna NULL mas o segredo já existe no Vault (nome é
  -- UNIQUE). Reaproveita em vez de tentar criar e violar a unicidade.
  IF v_existing_id IS NULL THEN
    SELECT id INTO v_existing_id FROM vault.secrets WHERE name = 'loja_openai_key';
  END IF;

  IF v_existing_id IS NOT NULL THEN
    PERFORM vault.update_secret(v_existing_id, p_key);
    UPDATE public.loja SET agente_openai_key_id = v_existing_id WHERE id = v_loja_id;
    RETURN v_existing_id;
  END IF;

  v_new_id := vault.create_secret(p_key, 'loja_openai_key');
  UPDATE public.loja SET agente_openai_key_id = v_new_id WHERE id = v_loja_id;
  RETURN v_new_id;
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.agente_openai_key_set(text) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.agente_openai_key_set(text) TO service_role;

COMMIT;

-- =====================================================================================
-- DOWN (rollback manual): não aplicável — reverter recriaria o 500 da 088/089.
-- Para remover a feature inteira, use o DOWN documentado na 088.
-- =====================================================================================
