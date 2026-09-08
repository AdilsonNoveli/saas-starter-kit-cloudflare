-- =====================================================================================
-- MIGRATION: Transactional Outbox para webhooks
-- Versão: 012
-- Fase do Plano: 2.11
-- Descrição: Persistência durável de eventos a serem entregues via webhook (n8n etc.).
--            O insert é feito na mesma transação do pedido (via dispatchWebhook em 3.6).
--            Um worker drena a fila com retry/backoff/idempotência.
-- =====================================================================================

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'webhook_outbox_status_enum') THEN
    CREATE TYPE webhook_outbox_status_enum AS ENUM (
      'pendente',
      'enviando',
      'enviado',
      'falha',
      'morto'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.webhook_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL UNIQUE,
  evento text NOT NULL,
  payload jsonb NOT NULL,
  destino_url text NOT NULL,
  status webhook_outbox_status_enum NOT NULL DEFAULT 'pendente',
  tentativas int NOT NULL DEFAULT 0,
  max_tentativas int NOT NULL DEFAULT 6,
  proxima_tentativa_em timestamptz NOT NULL DEFAULT now(),
  ultimo_erro text,
  http_status int,
  criado_em timestamptz NOT NULL DEFAULT now(),
  enviado_em timestamptz
);

COMMENT ON TABLE public.webhook_outbox IS
'Fila durável de eventos a serem entregues por webhook. Drenada por worker com backoff exponencial.';
COMMENT ON COLUMN public.webhook_outbox.event_id IS 'Idempotency key (UNIQUE). Reusada como Idempotency-Key no header.';
COMMENT ON COLUMN public.webhook_outbox.evento IS 'Nome do evento (ex.: pedido.criado, pedido.status_alterado).';
COMMENT ON COLUMN public.webhook_outbox.proxima_tentativa_em IS
'Quando o worker pode tentar novamente. Backoff exponencial.';
COMMENT ON COLUMN public.webhook_outbox.status IS
'pendente | enviando | enviado | falha (retentável) | morto (atingiu max_tentativas).';

-- Índice de seleção do worker (status + proxima_tentativa_em)
CREATE INDEX IF NOT EXISTS idx_webhook_outbox_pending
ON public.webhook_outbox (status, proxima_tentativa_em)
WHERE status IN ('pendente','falha');

CREATE INDEX IF NOT EXISTS idx_webhook_outbox_evento_criado
ON public.webhook_outbox (evento, criado_em DESC);

-- RLS — apenas service role escreve/lê; staff (gerente+) lê para auditoria
ALTER TABLE public.webhook_outbox ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff read webhook_outbox" ON public.webhook_outbox;
CREATE POLICY "Staff read webhook_outbox" ON public.webhook_outbox
FOR SELECT
USING (public.has_role(ARRAY['gerente','administrador','proprietario']::role_usuario_enum[]));

-- Inserção/atualização: feita pelo backend com service role (bypass RLS).

COMMIT;
