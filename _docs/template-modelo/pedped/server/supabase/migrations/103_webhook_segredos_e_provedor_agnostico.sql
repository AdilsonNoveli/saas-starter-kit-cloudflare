-- =====================================================================================
-- MIGRATION: segredos do webhook no Vault + provedor de WhatsApp agnóstico
-- Versão: 103
-- =====================================================================================
-- CONTEXTO: _docs/em-andamento.md §8.16/§8.18. Duas mudanças independentes que
-- compartilham a mesma tese — nada de fornecedor nem de segredo cravado fora do
-- alcance de quem opera a loja.
--
-- (A) SEGREDOS DO WEBHOOK SAEM DO AMBIENTE E VÊM PARA O VAULT
--
-- Até aqui, `NUXT_WEBHOOK_TOKEN` e `NUXT_WEBHOOK_SIGNING_SECRET` viviam em
-- variável de ambiente / `wrangler secret`. Na prática isso significa que só
-- quem tem acesso ao deploy configura o webhook — o lojista não consegue
-- apontar a notificação para o sistema dele sozinho. Como o modelo é
-- instalação separada por loja, isso é uma trava operacional, não segurança.
--
-- Por que Vault e NÃO uma coluna de texto: `vault.create_secret()` grava com
-- criptografia autenticada em disco e a chave de criptografia nunca fica no
-- banco. Guardar um Bearer e uma chave de HMAC em coluna legível seria trocar
-- um problema de usabilidade por vazamento de credencial — qualquer dump,
-- backup ou SELECT distraído entrega os dois. Mesmo modelo já usado para a
-- chave OpenAI (088/090/092) e para o token do provedor de WhatsApp (093).
--
-- UMA função por operação, parametrizada pelo tipo de segredo, em vez de seis
-- funções quase idênticas: os dois segredos têm exatamente o mesmo ciclo de
-- vida, e duplicar o corpo é como as versões divergem com o tempo.
--
-- `webhook_ativo` separa "desligado" de "não configurado". Hoje a única forma
-- de desligar é apagar a URL, o que perde a configuração inteira — o lojista
-- que quer parar o envio por um dia tem de reconfigurar tudo depois. Default
-- `false`: instalação nova não sai notificando ninguém sem alguém decidir.
--
-- (B) PROVEDOR DE WHATSAPP DEIXA DE NASCER COM FORNECEDOR CRAVADO
--
-- A 093 criou `whatsapp_provedor_nome` e `whatsapp_api_base_url` com DEFAULT
-- apontando para um fornecedor específico. Instalação nova nascia acoplada a
-- ele sem ninguém escolher. Os DEFAULTs saem; o DADO EXISTENTE NÃO É TOCADO —
-- a loja que hoje usa esse provedor continua funcionando exatamente igual.
-- Apagar a configuração viva de quem está em produção seria trocar um problema
-- de arquitetura por uma interrupção de atendimento.
-- =====================================================================================

BEGIN;

-- ─── (A) Colunas do webhook ──────────────────────────────────────────────────
ALTER TABLE public.loja
  ADD COLUMN IF NOT EXISTS webhook_ativo                     boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS webhook_token_id                  uuid,
  ADD COLUMN IF NOT EXISTS webhook_token_mascara             text,
  ADD COLUMN IF NOT EXISTS webhook_signing_secret_id         uuid,
  ADD COLUMN IF NOT EXISTS webhook_signing_secret_mascara    text;

COMMENT ON COLUMN public.loja.webhook_ativo IS
  'Liga/desliga o envio de notificações sem perder a configuração. Separado de webhook_url IS NULL, que significa "não configurado".';

-- ─── Nomes dos segredos no Vault ─────────────────────────────────────────────
-- Mantidos como mapa numa função só para que set/get/delete não possam
-- divergir sobre como o segredo se chama — divergência aqui deixa segredo
-- órfão, que foi o bug reconciliado na migration 090.
CREATE OR REPLACE FUNCTION public.webhook_secret_nome(p_tipo text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $function$
  SELECT CASE p_tipo
    WHEN 'token'   THEN 'loja_webhook_token'
    WHEN 'signing' THEN 'loja_webhook_signing_secret'
  END;
$function$;

-- ─── webhook_secret_get: única leitura de vault.decrypted_secrets ────────────
-- SECURITY DEFINER porque `vault.decrypted_secrets` não é acessível a
-- `service_role` por padrão, só ao dono da função (menor privilégio, mesmo
-- modelo de `agente_openai_key_get`).
CREATE OR REPLACE FUNCTION public.webhook_secret_get(p_tipo text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog', 'vault'
AS $function$
DECLARE
  v_key_id uuid;
  v_secret text;
BEGIN
  IF public.webhook_secret_nome(p_tipo) IS NULL THEN
    RAISE EXCEPTION 'Tipo de segredo de webhook desconhecido: %', p_tipo;
  END IF;

  SELECT CASE p_tipo
           WHEN 'token'   THEN webhook_token_id
           WHEN 'signing' THEN webhook_signing_secret_id
         END
    INTO v_key_id
    FROM public.loja
   LIMIT 1;

  IF v_key_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT decrypted_secret INTO v_secret FROM vault.decrypted_secrets WHERE id = v_key_id;
  RETURN v_secret;
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.webhook_secret_get(text) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.webhook_secret_get(text) TO service_role;

-- ─── webhook_secret_set: única escrita em vault.create_secret/update_secret ──
CREATE OR REPLACE FUNCTION public.webhook_secret_set(p_tipo text, p_valor text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog', 'vault'
AS $function$
DECLARE
  v_loja_id     uuid;
  v_key_id      uuid;
  v_nome        text := public.webhook_secret_nome(p_tipo);
  v_existing_id uuid;
  v_new_id      uuid;
BEGIN
  IF v_nome IS NULL THEN
    RAISE EXCEPTION 'Tipo de segredo de webhook desconhecido: %', p_tipo;
  END IF;

  SELECT id,
         CASE p_tipo
           WHEN 'token'   THEN webhook_token_id
           WHEN 'signing' THEN webhook_signing_secret_id
         END
    INTO v_loja_id, v_key_id
    FROM public.loja
   LIMIT 1;

  IF v_loja_id IS NULL THEN
    RAISE EXCEPTION 'Nenhuma loja cadastrada.';
  END IF;

  IF v_key_id IS NOT NULL THEN
    PERFORM vault.update_secret(v_key_id, p_valor);
    RETURN;
  END IF;

  -- Reconcilia o estado divergente (coluna zerada, segredo vivo no Vault): sem
  -- isto, `create_secret` falharia no UNIQUE do nome e a gravação ficaria
  -- travada para sempre. Mesmo cuidado da migration 090.
  SELECT id INTO v_existing_id FROM vault.secrets WHERE name = v_nome;
  IF v_existing_id IS NOT NULL THEN
    PERFORM vault.update_secret(v_existing_id, p_valor);
    v_new_id := v_existing_id;
  ELSE
    -- Atribuição direta: `vault.create_secret` retorna escalar, não tabela —
    -- usá-la em FROM foi o bug da 088, corrigido na 089.
    v_new_id := vault.create_secret(p_valor, v_nome);
  END IF;

  IF p_tipo = 'token' THEN
    UPDATE public.loja SET webhook_token_id = v_new_id WHERE id = v_loja_id;
  ELSE
    UPDATE public.loja SET webhook_signing_secret_id = v_new_id WHERE id = v_loja_id;
  END IF;
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.webhook_secret_set(text, text) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.webhook_secret_set(text, text) TO service_role;

-- ─── webhook_secret_delete: revogação de verdade ─────────────────────────────
-- Apaga o segredo do Vault, não só zera a coluna: revogação que deixa o texto
-- cifrado no banco não é revogação (mesma decisão da migration 092).
CREATE OR REPLACE FUNCTION public.webhook_secret_delete(p_tipo text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog', 'vault'
AS $function$
DECLARE
  v_loja_id uuid;
  v_key_id  uuid;
  v_nome    text := public.webhook_secret_nome(p_tipo);
BEGIN
  IF v_nome IS NULL THEN
    RAISE EXCEPTION 'Tipo de segredo de webhook desconhecido: %', p_tipo;
  END IF;

  SELECT id,
         CASE p_tipo
           WHEN 'token'   THEN webhook_token_id
           WHEN 'signing' THEN webhook_signing_secret_id
         END
    INTO v_loja_id, v_key_id
    FROM public.loja
   LIMIT 1;

  IF v_loja_id IS NULL THEN
    RETURN false;
  END IF;

  IF v_key_id IS NULL THEN
    SELECT id INTO v_key_id FROM vault.secrets WHERE name = v_nome;
  END IF;

  IF p_tipo = 'token' THEN
    UPDATE public.loja SET webhook_token_id = NULL, webhook_token_mascara = NULL WHERE id = v_loja_id;
  ELSE
    UPDATE public.loja SET webhook_signing_secret_id = NULL, webhook_signing_secret_mascara = NULL WHERE id = v_loja_id;
  END IF;

  IF v_key_id IS NULL THEN
    RETURN false;
  END IF;

  DELETE FROM vault.secrets WHERE id = v_key_id;
  RETURN true;
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.webhook_secret_delete(text) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.webhook_secret_delete(text) TO service_role;

-- ─── (B) Provedor de WhatsApp sem fornecedor cravado ─────────────────────────
-- O default vira vazio, e não `DROP DEFAULT`: as colunas são `NOT NULL`, então
-- remover o default sem mais nada faria um INSERT que não as cite estourar.
-- `UPDATE` nenhum: o valor que a loja já tem é a configuração viva dela e
-- continua valendo — apagar isso interromperia o atendimento de quem está em
-- produção para resolver um problema de arquitetura.
ALTER TABLE public.loja ALTER COLUMN whatsapp_provedor_nome SET DEFAULT '';
ALTER TABLE public.loja ALTER COLUMN whatsapp_api_base_url  SET DEFAULT '';

COMMENT ON COLUMN public.loja.whatsapp_provedor_nome IS
  'Nome do provedor de WhatsApp escolhido pela loja. Sem default: a aplicação é agnóstica de fornecedor.';
COMMENT ON COLUMN public.loja.whatsapp_api_base_url IS
  'URL base da API do provedor (espelho da Cloud API). Sem default: configuração obrigatória de quem instala.';

COMMIT;

-- =====================================================================================
-- DOWN (rollback manual):
--   DROP FUNCTION IF EXISTS public.webhook_secret_delete(text);
--   DROP FUNCTION IF EXISTS public.webhook_secret_set(text, text);
--   DROP FUNCTION IF EXISTS public.webhook_secret_get(text);
--   DROP FUNCTION IF EXISTS public.webhook_secret_nome(text);
--   ALTER TABLE public.loja
--     DROP COLUMN IF EXISTS webhook_ativo,
--     DROP COLUMN IF EXISTS webhook_token_id,
--     DROP COLUMN IF EXISTS webhook_token_mascara,
--     DROP COLUMN IF EXISTS webhook_signing_secret_id,
--     DROP COLUMN IF EXISTS webhook_signing_secret_mascara;
--   -- os DEFAULTs de provedor NÃO são restaurados: eram o acoplamento removido.
-- =====================================================================================
