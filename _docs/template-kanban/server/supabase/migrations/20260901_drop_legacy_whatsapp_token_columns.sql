-- Migration 129: remove colunas legadas de credencial de WhatsApp em texto plano.
-- Idempotente: seguro rodar mais de uma vez (DROP COLUMN IF EXISTS).
--
-- ACHADO DE SEGURANÇA (Crítica, auditoria 2026-09-01): `store` guardava o token
-- de um provedor de WhatsApp legado, descontinuado, em TEXTO PLANO, e a policy
-- "Public read available store" (USING (true)) expõe TODAS as colunas de
-- `store` a qualquer portador da anon key — inclusive um visitante anônimo do
-- catálogo. Qualquer pessoa com a anon key (pública, embutida no bundle do
-- frontend) podia ler o token de WhatsApp da loja em claro via PostgREST.
--
-- Confirmado por `grep` que nenhum código do app (server/ ou app/) referencia
-- estas duas colunas: a integração migrou para o padrão Vault
-- (`whatsapp_api_key_id`/`whatsapp_api_key_get/set/delete`, migration 093) e o
-- par do provedor legado ficou órfão. Por não terem uso real, a correção é
-- remover as colunas (não migrar para o Vault) — elimina o vazamento sem
-- introduzir superfície nova.
ALTER TABLE public.store
  DROP COLUMN IF EXISTS uazapi_instance_token,
  DROP COLUMN IF EXISTS uazapi_instance_name;
