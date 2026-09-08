-- =====================================================================================
-- MIGRATION: Nome real do WhatsApp (pushname) — encaminhamento até o cadastro
-- Versão: 107
-- =====================================================================================
-- CONTEXTO: `clientes.nome` nascia sempre 'Cliente WhatsApp' — `profile.name`
-- (o "pushname" que o próprio cliente configura no WhatsApp) já era extraído
-- em `parseInboundPayload.ts` desde a §7.4, mas nunca chegava até
-- `findOrCreateCustomer` (fio solto, não decisão de design). A lógica de
-- backfill (`shouldBackfillName`/`PLACEHOLDER_NAMES`) já existia e nunca tinha
-- dado com que trabalhar.
--
-- `whatsapp_midia.nome_contato` fecha o caminho de MÍDIA (áudio/imagem como
-- primeiro contato): o texto de texto digitado resolve o cliente antes de
-- enfileirar (`gateInboundTurn`, sem precisar de tabela nova), mas o de mídia
-- só resolve o cliente depois da transcrição/visão, num consumer separado — o
-- pushname precisa sobreviver a essa travessia assíncrona, e só a linha de
-- `whatsapp_midia` está viva para carregá-lo.
-- =====================================================================================

BEGIN;

ALTER TABLE public.whatsapp_midia
  ADD COLUMN IF NOT EXISTS nome_contato text;

COMMENT ON COLUMN public.whatsapp_midia.nome_contato IS
  'contacts[].profile.name do payload inbound original (pushname do WhatsApp) — sobrevive até o consumer de mídia resolver o cliente em deliverToTurn/gateInboundTurn, depois da transcrição/visão. Sanitizado só no destino (findOrCreateCustomer → sanitizeContactName.ts), nunca aqui.';

-- `whatsapp_midia_claim` (migration 094, RETURNS TABLE) precisa devolver a
-- coluna nova para `claimMedia.ts` chegar até ela — Postgres não deixa
-- `CREATE OR REPLACE FUNCTION` mudar o formato de RETURNS TABLE, por isso o
-- DROP explícito antes do CREATE (mesmo padrão de incidente que a 038/075/090
-- já ensinaram sobre esta função: UPDATE sempre com WHERE).
DROP FUNCTION IF EXISTS public.whatsapp_midia_claim(text, integer);
CREATE FUNCTION public.whatsapp_midia_claim(
  p_wamid          text,
  p_max_tentativas integer
)
RETURNS TABLE (
  wamid         text,
  telefone      text,
  whatsapp_lid  text,
  nome_contato  text,
  tipo          text,
  media_id      text,
  mime_type     text,
  tamanho_bytes integer,
  tentativas    integer
)
LANGUAGE plpgsql
SET search_path TO 'public', 'pg_catalog'
AS $function$
BEGIN
  RETURN QUERY
  UPDATE public.whatsapp_midia AS m
     SET status        = 'processando',
         tentativas    = m.tentativas + 1,
         atualizado_em = now()
   WHERE m.wamid = p_wamid
     AND m.status IN ('pendente','falhou')
     AND m.tentativas < p_max_tentativas
  RETURNING m.wamid, m.telefone, m.whatsapp_lid, m.nome_contato, m.tipo, m.media_id, m.mime_type, m.tamanho_bytes, m.tentativas;
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.whatsapp_midia_claim(text, integer) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.whatsapp_midia_claim(text, integer) TO service_role;

COMMIT;

-- =====================================================================================
-- DOWN (rollback manual):
--   DROP FUNCTION IF EXISTS public.whatsapp_midia_claim(text, integer);
--   CREATE FUNCTION public.whatsapp_midia_claim(p_wamid text, p_max_tentativas integer)
--   RETURNS TABLE (wamid text, telefone text, whatsapp_lid text, tipo text,
--                  media_id text, mime_type text, tamanho_bytes integer, tentativas integer)
--   LANGUAGE plpgsql SET search_path TO 'public', 'pg_catalog' AS $$
--   BEGIN
--     RETURN QUERY
--     UPDATE public.whatsapp_midia AS m
--        SET status = 'processando', tentativas = m.tentativas + 1, atualizado_em = now()
--      WHERE m.wamid = p_wamid AND m.status IN ('pendente','falhou') AND m.tentativas < p_max_tentativas
--     RETURNING m.wamid, m.telefone, m.whatsapp_lid, m.tipo, m.media_id, m.mime_type, m.tamanho_bytes, m.tentativas;
--   END;
--   $$;
--   REVOKE EXECUTE ON FUNCTION public.whatsapp_midia_claim(text, integer) FROM PUBLIC, anon, authenticated;
--   GRANT  EXECUTE ON FUNCTION public.whatsapp_midia_claim(text, integer) TO service_role;
--   ALTER TABLE public.whatsapp_midia DROP COLUMN IF EXISTS nome_contato;
-- =====================================================================================
