-- =====================================================================================
-- MIGRATION: Reconstrói integration_idempotency no schema atual (key/payload)
-- Versão: 057
-- =====================================================================================
-- CONTEXTO (auditoria pré-prod, 2026-07-12):
--   A tabela `integration_idempotency` NÃO existe no banco de produção — a
--   migration 017 (que a criava com o schema antigo `idempotency_key`/`pedido_id`)
--   nunca foi aplicada, e o código evoluiu para o schema `key`/`payload`/`status`
--   (ver app/types/database.types.ts). Resultado em produção: a idempotência da
--   integração inbound está inerte — retries do n8n em POST /orders e /cart/checkout
--   podem DUPLICAR pedidos, pois a consulta/insert falham silenciosamente.
--
--   Esta migration cria a tabela no schema que o código e os tipos esperam. É
--   idempotente (IF NOT EXISTS) e segura para bancos onde a 017 antiga tenha
--   rodado: nesse caso, apenas adiciona as colunas ausentes.
--
--   Chave da correção: UNIQUE(key) atua como trava — o primeiro registro vence,
--   e uma corrida com a mesma Idempotency-Key gera erro 23505 (tratado como
--   benigno na aplicação).
-- =====================================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.integration_idempotency (
  id          uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key         text        NOT NULL,
  payload     jsonb,
  status      text        NOT NULL DEFAULT 'completed',
  expires_at  timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  criado_em   timestamptz NOT NULL DEFAULT now()
);

-- Colunas de compatibilidade caso a tabela já exista de uma versão anterior.
ALTER TABLE public.integration_idempotency ADD COLUMN IF NOT EXISTS key        text;
ALTER TABLE public.integration_idempotency ADD COLUMN IF NOT EXISTS payload    jsonb;
ALTER TABLE public.integration_idempotency ADD COLUMN IF NOT EXISTS status     text NOT NULL DEFAULT 'completed';
ALTER TABLE public.integration_idempotency ADD COLUMN IF NOT EXISTS expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days');
ALTER TABLE public.integration_idempotency ADD COLUMN IF NOT EXISTS criado_em  timestamptz NOT NULL DEFAULT now();

-- Trava de idempotência: sem o UNIQUE, retries concorrentes não são barrados.
CREATE UNIQUE INDEX IF NOT EXISTS integration_idempotency_key_uidx
  ON public.integration_idempotency (key);

-- Suporte a limpeza periódica das chaves vencidas (housekeeping opcional).
CREATE INDEX IF NOT EXISTS integration_idempotency_expires_at_idx
  ON public.integration_idempotency (expires_at);

COMMENT ON TABLE public.integration_idempotency IS
'Idempotência da integração inbound: Idempotency-Key -> pedido (payload.pedido_id). UNIQUE(key) evita pedidos duplicados em retries do n8n.';

-- Acesso exclusivo via service role (backend). RLS habilitado SEM policies =
-- anon/authenticated bloqueados; o service role faz bypass de RLS.
ALTER TABLE public.integration_idempotency ENABLE ROW LEVEL SECURITY;

COMMIT;
