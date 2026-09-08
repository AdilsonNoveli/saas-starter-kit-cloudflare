-- =====================================================================================
-- MIGRATION: Schema do agente WhatsApp in-app (transporte)
-- Versão: 087
-- =====================================================================================
-- CONTEXTO: _docs/implementar/arquitetura-agente-whatsapp-in-app.md, seções 4 e 9.
--
--   whatsapp_mensagens_recebidas — dedup de mensagens inbound. `wamid` (id da
--     mensagem, único por design da Meta Cloud API) como PRIMARY KEY: a
--     segunda tentativa de INSERT sob reentrega da Meta (webhook
--     at-least-once) falha por violação de unicidade (23505) — dedupe.ts
--     usa isso como sinal de duplicata, sem tabela auxiliar de lock.
--
--   whatsapp_turno_buffer — buffer de rajada (debounce). Acumula o texto de
--     cada mensagem por telefone; `ultima_msg_id` grava o wamid mais recente
--     do lote. O claim atômico do consumer (`DELETE ... WHERE telefone = $1
--     AND ultima_msg_id = $2 RETURNING *`, seção 4) só processa o lote se
--     nenhuma mensagem nova chegou entre o agendamento e a entrega da fila —
--     uma mensagem nova reescreve `ultima_msg_id` e o claim anterior vira
--     no-op.
--
--   whatsapp_conversas — histórico de turno (só `user`/`assistant`; tool
--     calls são andaime interno do turno, não persistem).
--
--   agente_uso_tokens — telemetria de custo/latência por turno do agente.
--
--   Acesso exclusivo via service_role (RLS habilitado sem policy de acesso —
--   mesmo padrão de `integration_idempotency`/`webhook_outbox`).
-- =====================================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.whatsapp_mensagens_recebidas (
  wamid        text        NOT NULL PRIMARY KEY,
  recebido_em  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.whatsapp_turno_buffer (
  telefone      text        NOT NULL PRIMARY KEY,
  textos        jsonb       NOT NULL DEFAULT '[]'::jsonb,
  ultima_msg_id text        NOT NULL,
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.whatsapp_conversas (
  id        uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id uuid       NOT NULL REFERENCES public.clientes(id),
  role      text        NOT NULL CHECK (role IN ('user', 'assistant')),
  content   text        NOT NULL,
  criado_em timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversas_cliente_criado
  ON public.whatsapp_conversas (cliente_id, criado_em DESC);

CREATE TABLE IF NOT EXISTS public.agente_uso_tokens (
  id                uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id        uuid        REFERENCES public.clientes(id),
  modelo            text        NOT NULL,
  prompt_tokens     integer     NOT NULL,
  completion_tokens integer     NOT NULL,
  latencia_ms       integer,
  criado_em         timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.whatsapp_mensagens_recebidas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_turno_buffer        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_conversas            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agente_uso_tokens              ENABLE ROW LEVEL SECURITY;

-- ─── whatsapp_buffer_append: upsert atômico do buffer de rajada ──────────────
-- Sem isto, um append via SELECT + UPDATE em `textos` (jsonb) no lado da
-- aplicação teria uma janela de corrida entre duas mensagens quase
-- simultâneas do mesmo telefone (uma sobrescreveria a outra). O `textos ||
-- jsonb_build_array(...)` do UPDATE roda dentro da mesma instrução SQL —
-- Postgres serializa via o lock de linha implícito do UPDATE/ON CONFLICT.
CREATE OR REPLACE FUNCTION public.whatsapp_buffer_append(
  p_telefone text,
  p_texto    text,
  p_msg_id   text
)
RETURNS void
LANGUAGE plpgsql
SET search_path TO 'public', 'pg_catalog'
AS $function$
BEGIN
  INSERT INTO public.whatsapp_turno_buffer (telefone, textos, ultima_msg_id)
  VALUES (p_telefone, jsonb_build_array(p_texto), p_msg_id)
  ON CONFLICT (telefone) DO UPDATE
  SET textos        = public.whatsapp_turno_buffer.textos || jsonb_build_array(p_texto),
      ultima_msg_id = p_msg_id,
      atualizado_em = now();
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.whatsapp_buffer_append(text, text, text) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.whatsapp_buffer_append(text, text, text) TO service_role;

COMMIT;

-- =====================================================================================
-- DOWN (rollback manual):
--   DROP FUNCTION IF EXISTS public.whatsapp_buffer_append(text, text, text);
--   DROP TABLE IF EXISTS public.agente_uso_tokens;
--   DROP TABLE IF EXISTS public.whatsapp_conversas;
--   DROP TABLE IF EXISTS public.whatsapp_turno_buffer;
--   DROP TABLE IF EXISTS public.whatsapp_mensagens_recebidas;
-- =====================================================================================
