-- =====================================================================================
-- MIGRATION: o buffer de rajada carrega o identificador estável do WhatsApp
-- Versão: 100
-- =====================================================================================
-- CONTEXTO: `_docs/em-andamento.md`, FASE 0.4, item (a).
--
-- O QUE ESTAVA ERRADO
--   `clientes.whatsapp_lid` existe desde a migration 031 (com índice único
--   parcial), a 032 já permite cadastro lid-only e `findOrCreateCustomer` já
--   busca pelo lid ANTES do telefone, com backfill bidirecional. O parser do
--   webhook (`parseInboundPayload`) já extrai o identificador — o provedor o
--   envia em todos os payloads capturados.
--
--   E o fluxo do agente jogava o identificador no lixo. `whatsapp_turno_buffer`
--   não tinha coluna para ele, então mesmo que o produtor o passasse, o valor
--   não sobreviveria aos ~8s de debounce entre o produtor e o consumer. O
--   consumer chamava `getCustomerContext({ whatsapp })` com telefone puro, e o
--   lookup lid-first ficava inútil: em 2026-07-29, 4 de 64 clientes tinham
--   `whatsapp_lid` preenchido (todos vindos por outro caminho).
--
--   Consequência: telefone é o único identificador gravado. Cliente que troca de
--   número (mesma conta do WhatsApp, `user_id` estável) nasce como cadastro novo
--   — isso já é possível hoje, sem depender de nenhuma mudança da Meta.
--
-- O QUE MUDA
--   1. `whatsapp_turno_buffer.whatsapp_lid` (nullable): o identificador
--      atravessa o debounce junto do lote de textos.
--   2. `whatsapp_buffer_append` recebe `p_lid`, opcional.
--
--   `COALESCE(p_lid, whatsapp_turno_buffer.whatsapp_lid)` no ON CONFLICT é
--   obrigatório, não estilo: numa rajada mista (texto + áudio), o append que vem
--   do consumer de mídia NÃO tem o lid — `whatsapp_midia` também é chaveada por
--   telefone (item (c) da FASE 0.4, ainda em aberto). Sem o COALESCE, o áudio
--   apagaria o lid que a mensagem de texto anterior acabou de gravar.
--
--   Nullable, e não NOT NULL: o buffer segue chaveado por telefone (item (b) da
--   FASE 0.4). Payload sem `user_id` continua sendo um turno válido.
--
--   A assinatura antiga é DROPADA em vez de sobrecarregada: com um
--   `CREATE OR REPLACE` de 4 argumentos convivendo com a de 3, a chamada de 3
--   argumentos passaria a ser ambígua (42725) — o default do 4º torna as duas
--   candidatas para a mesma aridade.
--
-- DEPOIS DE APLICAR, EXECUTE O RPC UMA VEZ (armadilha nº 1 do handoff —
-- `CREATE FUNCTION` não valida corpo plpgsql; migration aplicada ≠ função
-- executável). O bloco abaixo faz isso dentro da própria transação e limpa
-- atrás de si, com `WHERE` (pg-safeupdate, armadilha nº 2):
--   SELECT public.whatsapp_buffer_append('__smoke__', 'ping', 'wamid.__smoke__', 'LID.__smoke__');
--   DELETE FROM public.whatsapp_turno_buffer WHERE telefone = '__smoke__';
-- =====================================================================================

BEGIN;

ALTER TABLE public.whatsapp_turno_buffer
  ADD COLUMN IF NOT EXISTS whatsapp_lid text;

COMMENT ON COLUMN public.whatsapp_turno_buffer.whatsapp_lid IS
  'Identificador estável do WhatsApp (contacts[].user_id / messages[].from_user_id) do lote. NULL quando o payload não trouxe — ou quando o append veio do consumer de mídia, que não conhece o lid.';

DROP FUNCTION IF EXISTS public.whatsapp_buffer_append(text, text, text);

CREATE OR REPLACE FUNCTION public.whatsapp_buffer_append(
  p_telefone text,
  p_texto    text,
  p_msg_id   text,
  p_lid      text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SET search_path TO 'public', 'pg_catalog'
AS $function$
BEGIN
  INSERT INTO public.whatsapp_turno_buffer (telefone, textos, ultima_msg_id, whatsapp_lid)
  VALUES (p_telefone, jsonb_build_array(p_texto), p_msg_id, p_lid)
  ON CONFLICT (telefone) DO UPDATE
  SET textos        = public.whatsapp_turno_buffer.textos || jsonb_build_array(p_texto),
      ultima_msg_id = p_msg_id,
      -- Nunca rebaixa para NULL: o append de mídia não conhece o lid (ver cabeçalho).
      whatsapp_lid  = COALESCE(p_lid, public.whatsapp_turno_buffer.whatsapp_lid),
      atualizado_em = now();
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.whatsapp_buffer_append(text, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.whatsapp_buffer_append(text, text, text, text) TO service_role;

-- Smoke do corpo plpgsql, na mesma transação: se o corpo estiver quebrado, a
-- migration falha aqui em vez de na primeira mensagem real de um cliente.
DO $smoke$
BEGIN
  PERFORM public.whatsapp_buffer_append('__smoke__', 'ping', 'wamid.__smoke__', 'LID.__smoke__');
  -- Segundo append sem lid: prova o COALESCE do ON CONFLICT.
  PERFORM public.whatsapp_buffer_append('__smoke__', 'pong', 'wamid.__smoke2__');
  IF (SELECT whatsapp_lid FROM public.whatsapp_turno_buffer WHERE telefone = '__smoke__') IS NULL THEN
    RAISE EXCEPTION 'whatsapp_buffer_append apagou o lid num append sem p_lid';
  END IF;
  DELETE FROM public.whatsapp_turno_buffer WHERE telefone = '__smoke__';
END
$smoke$;

COMMIT;

-- =====================================================================================
-- DOWN (rollback manual):
--   DROP FUNCTION IF EXISTS public.whatsapp_buffer_append(text, text, text, text);
--   CREATE OR REPLACE FUNCTION public.whatsapp_buffer_append(
--     p_telefone text, p_texto text, p_msg_id text
--   ) RETURNS void LANGUAGE plpgsql SET search_path TO 'public', 'pg_catalog' AS $f$
--   BEGIN
--     INSERT INTO public.whatsapp_turno_buffer (telefone, textos, ultima_msg_id)
--     VALUES (p_telefone, jsonb_build_array(p_texto), p_msg_id)
--     ON CONFLICT (telefone) DO UPDATE
--     SET textos        = public.whatsapp_turno_buffer.textos || jsonb_build_array(p_texto),
--         ultima_msg_id = p_msg_id,
--         atualizado_em = now();
--   END; $f$;
--   REVOKE EXECUTE ON FUNCTION public.whatsapp_buffer_append(text, text, text) FROM PUBLIC, anon, authenticated;
--   GRANT  EXECUTE ON FUNCTION public.whatsapp_buffer_append(text, text, text) TO service_role;
--   ALTER TABLE public.whatsapp_turno_buffer DROP COLUMN IF EXISTS whatsapp_lid;
-- =====================================================================================
