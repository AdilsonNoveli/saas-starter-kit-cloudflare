-- =====================================================================================
-- MIGRATION: Configuração do agente WhatsApp + chave OpenAI via Supabase Vault
-- Versão: 088
-- =====================================================================================
-- CONTEXTO: _docs/implementar/arquitetura-agente-whatsapp-in-app.md, seções 8 e 10 (passo
-- 8 da seção 12) — cobre as duas fatias juntas: as colunas de config direta
-- (`agente_ativo`/`agente_instrucoes_extra`/`agente_tools_habilitadas`, seção
-- 8, escritas pelo client autenticado via RLS em `/admin/settings`) e a chave
-- OpenAI via Vault (`agente_openai_key_id`/`agente_openai_key_mascara`/
-- `agente_modelo`, seção 10, escrita só pelo endpoint de backend
-- `POST /api/admin/integrations/openai-key`). Sem `agente_openai_key_id`
-- configurado ou com `agente_ativo = false`, o consumer cai no mesmo
-- fallback de "agente sem chave configurada" (seção 8).
--
-- Por que Vault (não coluna de texto): `vault.create_secret()` grava com
-- criptografia autenticada em disco — a chave de criptografia em si nunca fica
-- no banco. `agente_openai_key_get()` é a ÚNICA leitura de
-- `vault.decrypted_secrets` no runtime do agente (seção 10) — SECURITY DEFINER
-- porque `vault.decrypted_secrets` não é acessível a `service_role` por
-- padrão, só ao dono da função (mesmo modelo de menor privilégio de
-- `whatsapp_buffer_append`, migration 087). `agente_openai_key_set()` segue o
-- mesmo modelo para a escrita: `vault.create_secret`/`vault.update_secret`
-- também não são acessíveis a `service_role` por padrão.
--
-- BUG CONHECIDO nesta versão (corrigido na migration 089, não editado aqui
-- porque esta migration já foi aplicada em produção): o branch de criação da
-- chave usava `SELECT id INTO v_new_id FROM vault.create_secret(...)`.
-- `vault.create_secret` retorna um escalar `uuid`, não uma tabela — usá-la em
-- FROM produz uma coluna chamada `create_secret`, nunca `id`, então a query
-- falhava com `column "id" does not exist` toda vez que uma chave era salva
-- pela primeira vez. Ver 089_fix_agente_openai_key_set.sql para o fix
-- (atribuição direta `v_new_id := vault.create_secret(...)`).
-- =====================================================================================

BEGIN;

ALTER TABLE public.loja
  ADD COLUMN IF NOT EXISTS agente_openai_key_id       uuid,
  ADD COLUMN IF NOT EXISTS agente_openai_key_mascara  text,
  ADD COLUMN IF NOT EXISTS agente_modelo              text NOT NULL DEFAULT 'gpt-4.1-mini',
  ADD COLUMN IF NOT EXISTS agente_ativo               boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS agente_instrucoes_extra    text,
  ADD COLUMN IF NOT EXISTS agente_tools_habilitadas   jsonb NOT NULL DEFAULT '[
    "BuscarProdutos","DefinirItemCarrinho","ConsultarEnderecoEntrega",
    "AtualizarPedido","FinalizarPedido","ConsultarDetalhePedido",
    "EnviarBotaoCatalogo","ConsultarDatasEncomenda","AtualizarContexto"
  ]'::jsonb;

-- ─── agente_openai_key_get: única leitura de vault.decrypted_secrets ────────
-- Single-tenant (seção 1) — sem parâmetro, lê a única linha de `loja`.
CREATE OR REPLACE FUNCTION public.agente_openai_key_get()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog', 'vault'
AS $function$
DECLARE
  v_key_id uuid;
  v_secret text;
BEGIN
  SELECT agente_openai_key_id INTO v_key_id FROM public.loja LIMIT 1;
  IF v_key_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT decrypted_secret INTO v_secret FROM vault.decrypted_secrets WHERE id = v_key_id;
  RETURN v_secret;
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.agente_openai_key_get() FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.agente_openai_key_get() TO service_role;

-- ─── agente_openai_key_set: única escrita em vault.create_secret/update_secret ──
-- Cria o segredo na primeira gravação, atualiza in-place nas seguintes —
-- single-tenant, então nunca há mais de um `agente_openai_key_id` por vez.
-- Retorna o id (novo ou existente) para o endpoint confirmar sucesso; a
-- máscara é calculada em TypeScript pelo chamador, nunca aqui (seção 10).
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

  SELECT id INTO v_new_id FROM vault.create_secret(p_key, 'loja_openai_key');
  UPDATE public.loja SET agente_openai_key_id = v_new_id;
  RETURN v_new_id;
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.agente_openai_key_set(text) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.agente_openai_key_set(text) TO service_role;

COMMIT;

-- =====================================================================================
-- DOWN (rollback manual):
--   DROP FUNCTION IF EXISTS public.agente_openai_key_set(text);
--   DROP FUNCTION IF EXISTS public.agente_openai_key_get();
--   ALTER TABLE public.loja
--     DROP COLUMN IF EXISTS agente_tools_habilitadas,
--     DROP COLUMN IF EXISTS agente_instrucoes_extra,
--     DROP COLUMN IF EXISTS agente_ativo,
--     DROP COLUMN IF EXISTS agente_modelo,
--     DROP COLUMN IF EXISTS agente_openai_key_mascara,
--     DROP COLUMN IF EXISTS agente_openai_key_id;
-- =====================================================================================
