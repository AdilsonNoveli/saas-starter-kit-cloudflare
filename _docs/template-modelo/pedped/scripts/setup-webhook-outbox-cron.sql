-- =====================================================================================
-- Setup: pg_cron drena o `webhook_outbox` chamando o endpoint interno da app
-- Fase do Plano: 3.6
-- =====================================================================================
-- Pré-requisitos:
--   - Extensões `pg_cron` e `pg_net` habilitadas no Supabase (geralmente já vêm).
--   - Endpoint `POST /api/internal/webhook-worker` implantado (server/api/internal/...).
--   - `NUXT_WORKER_TOKEN` definido no ambiente da aplicação.
--
-- O job dispara a cada 1 minuto. O worker faz claim em lote, com timeout de 10s
-- por destino e backoff exponencial; cada execução é segura para rodar em paralelo
-- graças ao claim atômico via UPDATE com filtro de status.
--
-- IMPORTANTE: substitua os placeholders abaixo antes de executar:
--   :app_base_url   →  ex.: https://meusite.com
--   :worker_token   →  o mesmo valor de NUXT_WORKER_TOKEN definido no app
-- =====================================================================================

-- 1) Garante extensões.
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2) Função que aciona o endpoint do worker (idempotente: schedule reaproveita o job).
CREATE OR REPLACE FUNCTION public.trigger_webhook_outbox_worker()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_app_url   text := current_setting('app.base_url',    true);
  v_worker_token text := current_setting('app.worker_token', true);
BEGIN
  IF v_app_url IS NULL OR v_worker_token IS NULL THEN
    RAISE NOTICE 'app.base_url ou app.worker_token não configurados; pulando.';
    RETURN;
  END IF;

  PERFORM net.http_post(
    url     := v_app_url || '/api/internal/webhook-worker',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || v_worker_token,
      'Content-Type',  'application/json'
    ),
    body    := '{}'::jsonb
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.trigger_webhook_outbox_worker() FROM PUBLIC, anon, authenticated;

-- 3) Configurações do projeto (rode UMA vez como superuser; ajuste valores).
-- ALTER DATABASE postgres SET app.base_url    = 'https://meusite.com';
-- ALTER DATABASE postgres SET app.worker_token = 'cole-o-NUXT_WORKER_TOKEN-aqui';

-- 4) Agenda (executa a cada minuto). Re-rodar este bloco é idempotente.
SELECT cron.unschedule('webhook-outbox-drain') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'webhook-outbox-drain'
);
SELECT cron.schedule(
  'webhook-outbox-drain',
  '* * * * *',
  $$ SELECT public.trigger_webhook_outbox_worker(); $$
);

-- 5) Verificação rápida.
-- SELECT * FROM cron.job WHERE jobname = 'webhook-outbox-drain';
-- SELECT status, count(*) FROM public.webhook_outbox GROUP BY status;
