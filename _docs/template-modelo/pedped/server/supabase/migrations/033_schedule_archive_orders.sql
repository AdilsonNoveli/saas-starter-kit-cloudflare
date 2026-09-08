-- ============================================================
-- Migration 033 — Agenda o arquivamento de pedidos via pg_cron
-- Substitui o antigo Vercel Cron (removido junto com vercel.json).
-- Cria a função trigger_archive_orders() e o job horário 'archive-orders',
-- espelhando o padrão de 'webhook-outbox-drain'. Funciona tanto na instância
-- Cloudflare Workers quanto nos clientes Docker self-host (é lado Supabase).
-- Requer app.base_url + app.worker_token (mesmas configs do webhook worker);
-- sem elas, a função faz skip silencioso.
-- Idempotente.
-- ============================================================

CREATE OR REPLACE FUNCTION public.trigger_archive_orders()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_app_url      text := current_setting('app.base_url',     true);
  v_worker_token text := current_setting('app.worker_token', true);
BEGIN
  IF v_app_url IS NULL OR v_worker_token IS NULL THEN
    RAISE NOTICE 'app.base_url ou app.worker_token não configurados; pulando.';
    RETURN;
  END IF;

  PERFORM net.http_post(
    url     := v_app_url || '/api/cron/archive-orders',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || v_worker_token,
      'Content-Type',  'application/json'
    ),
    body    := '{}'::jsonb
  );
END;
$$;

SELECT cron.schedule(
  'archive-orders',
  '0 * * * *',
  'SELECT public.trigger_archive_orders();'
) WHERE NOT EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'archive-orders'
);
