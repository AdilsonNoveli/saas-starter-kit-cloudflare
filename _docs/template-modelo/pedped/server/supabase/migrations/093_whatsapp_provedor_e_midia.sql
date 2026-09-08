-- =====================================================================================
-- MIGRATION: provedor de WhatsApp configurável + flags de mídia do agente
-- Versão: 093
-- =====================================================================================
-- CONTEXTO: fase 2 da seção 11 de
-- `_docs/implementar/arquitetura-midia-e-provedor-whatsapp.md` (schema na §4.1).
-- Duas coisas na mesma migration porque as duas são colunas de `loja` e o
-- desenho as agrupou:
--
-- 1. Provedor de WhatsApp (§3.1) — hoje o fornecedor está acoplado ao código
--    por URL fixa (`cloudApiClient.ts`) e por env nomeada. As colunas abaixo
--    movem a parte não-secreta (URL base, rótulo) para o banco e o token para o
--    Vault, tornando a troca de provedor uma edição em `/admin/integrations`
--    em vez de um deploy. O token do webhook de ENTRADA continua em env
--    (`NUXT_WHATSAPP_WEBHOOK_TOKEN`): é segredo de transporte que compõe a URL
--    registrada no painel do provedor, não config de negócio.
-- 2. Flags de mídia (§6.1) — colunas já criadas aqui para que as fases 5–7 não
--    precisem de migration nova; a UI dos toggles vem na fase 7 e os modelos
--    ficam deliberadamente sem UI (trocáveis por SQL).
--
-- Os defaults reproduzem exatamente o comportamento de hoje
-- (`DEFAULT_CLOUD_API_BASE_URL` em `cloudApiClient.ts`), então aplicar esta
-- migration sozinha não muda nada em runtime — com o fallback de env da §3.2
-- ativo, o agente segue usando `NUXT_WHATSAPP_API_TOKEN` até alguém cadastrar
-- o token no card. Sem esse fallback, aplicar a migration derrubaria o agente
-- em produção até um admin abrir a tela.
--
-- As três RPCs são espelho exato de `agente_openai_key_set/get/delete`
-- (migrations 088/090/092) com o nome de segredo `loja_whatsapp_api_key`, e
-- herdam as três lições que já custaram incidentes lá:
--   • `vault.create_secret` retorna um escalar uuid — atribuição direta (`:=`),
--     nunca `SELECT id FROM vault.create_secret(...)` (incidente da 088/089).
--   • Todo UPDATE leva WHERE: a Supabase carrega `pg-safeupdate` no role do
--     PostgREST e aborta UPDATE/DELETE sem WHERE com `21000`, inclusive dentro
--     de SECURITY DEFINER (incidentes das 038/075 e 090).
--   • Reconciliação por `vault.secrets.name` antes de criar — o nome é UNIQUE,
--     e coluna NULL com segredo vivo (rollback parcial, restore, limpeza
--     manual) viraria 500 permanente sem caminho de recuperação pela UI.
--
-- SECURITY DEFINER nas três pelo mesmo motivo das RPCs da chave OpenAI:
-- `vault.secrets`/`vault.decrypted_secrets`/`vault.create_secret` não são
-- acessíveis a `service_role` por padrão, só ao dono da função.
-- =====================================================================================

BEGIN;

ALTER TABLE public.loja
  ADD COLUMN IF NOT EXISTS whatsapp_provedor_nome     text    NOT NULL DEFAULT 'Datafy',
  ADD COLUMN IF NOT EXISTS whatsapp_api_base_url      text    NOT NULL DEFAULT 'https://cloud.datafyapi.com.br',
  ADD COLUMN IF NOT EXISTS whatsapp_api_key_id        uuid,
  ADD COLUMN IF NOT EXISTS whatsapp_api_key_mascara   text,
  ADD COLUMN IF NOT EXISTS agente_audio_habilitado    boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS agente_imagem_habilitado   boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS agente_modelo_transcricao  text    NOT NULL DEFAULT 'gpt-4o-mini-transcribe',
  ADD COLUMN IF NOT EXISTS agente_modelo_visao        text    NOT NULL DEFAULT 'gpt-4o-mini';

-- ─── whatsapp_api_key_get: única leitura de vault.decrypted_secrets do token ──
-- Single-tenant (agente §1) — sem parâmetro, lê a única linha de `loja`.
CREATE OR REPLACE FUNCTION public.whatsapp_api_key_get()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog', 'vault'
AS $function$
DECLARE
  v_key_id uuid;
  v_secret text;
BEGIN
  SELECT whatsapp_api_key_id INTO v_key_id FROM public.loja LIMIT 1;
  IF v_key_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT decrypted_secret INTO v_secret FROM vault.decrypted_secrets WHERE id = v_key_id;
  RETURN v_secret;
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.whatsapp_api_key_get() FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.whatsapp_api_key_get() TO service_role;

-- ─── whatsapp_api_key_set: única escrita em vault.create_secret/update_secret ──
-- Retorna o id (novo ou reaproveitado); a máscara é calculada em TypeScript
-- pelo endpoint, nunca aqui (mesma divisão da chave OpenAI).
CREATE OR REPLACE FUNCTION public.whatsapp_api_key_set(p_key text)
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
  SELECT id, whatsapp_api_key_id
    INTO v_loja_id, v_existing_id
    FROM public.loja
   LIMIT 1;

  IF v_loja_id IS NULL THEN
    RAISE EXCEPTION 'Nenhuma loja cadastrada — configure a loja antes do token do provedor de WhatsApp.';
  END IF;

  IF v_existing_id IS NULL THEN
    SELECT id INTO v_existing_id FROM vault.secrets WHERE name = 'loja_whatsapp_api_key';
  END IF;

  IF v_existing_id IS NOT NULL THEN
    PERFORM vault.update_secret(v_existing_id, p_key);
    UPDATE public.loja SET whatsapp_api_key_id = v_existing_id WHERE id = v_loja_id;
    RETURN v_existing_id;
  END IF;

  v_new_id := vault.create_secret(p_key, 'loja_whatsapp_api_key');
  UPDATE public.loja SET whatsapp_api_key_id = v_new_id WHERE id = v_loja_id;
  RETURN v_new_id;
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.whatsapp_api_key_set(text) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.whatsapp_api_key_set(text) TO service_role;

-- ─── whatsapp_api_key_delete: revogação ───────────────────────────────────────
-- Apaga o segredo de fato; a URL base e o rótulo do provedor ficam (não são
-- credencial, e zerá-los faria o card perder a configuração junto com a
-- revogação). Idempotente: sem token configurado é no-op e retorna false.
CREATE OR REPLACE FUNCTION public.whatsapp_api_key_delete()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog', 'vault'
AS $function$
DECLARE
  v_loja_id uuid;
  v_key_id  uuid;
BEGIN
  SELECT id, whatsapp_api_key_id
    INTO v_loja_id, v_key_id
    FROM public.loja
   LIMIT 1;

  IF v_loja_id IS NULL THEN
    RETURN false;
  END IF;

  IF v_key_id IS NULL THEN
    SELECT id INTO v_key_id FROM vault.secrets WHERE name = 'loja_whatsapp_api_key';
  END IF;

  UPDATE public.loja
     SET whatsapp_api_key_id = NULL,
         whatsapp_api_key_mascara = NULL
   WHERE id = v_loja_id;

  IF v_key_id IS NULL THEN
    RETURN false;
  END IF;

  DELETE FROM vault.secrets WHERE id = v_key_id;
  RETURN true;
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.whatsapp_api_key_delete() FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.whatsapp_api_key_delete() TO service_role;

COMMIT;

-- =====================================================================================
-- DOWN (rollback manual):
--   DROP FUNCTION IF EXISTS public.whatsapp_api_key_delete();
--   DROP FUNCTION IF EXISTS public.whatsapp_api_key_set(text);
--   DROP FUNCTION IF EXISTS public.whatsapp_api_key_get();
--   DELETE FROM vault.secrets WHERE name = 'loja_whatsapp_api_key';
--   ALTER TABLE public.loja
--     DROP COLUMN IF EXISTS agente_modelo_visao,
--     DROP COLUMN IF EXISTS agente_modelo_transcricao,
--     DROP COLUMN IF EXISTS agente_imagem_habilitado,
--     DROP COLUMN IF EXISTS agente_audio_habilitado,
--     DROP COLUMN IF EXISTS whatsapp_api_key_mascara,
--     DROP COLUMN IF EXISTS whatsapp_api_key_id,
--     DROP COLUMN IF EXISTS whatsapp_api_base_url,
--     DROP COLUMN IF EXISTS whatsapp_provedor_nome;
-- =====================================================================================
