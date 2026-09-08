-- =====================================================================================
-- MIGRATION: registro de mídia recebida do WhatsApp + claim atômico da fila
-- Versão: 094
-- =====================================================================================
-- CONTEXTO: fase 4 da seção 11 de
-- `_docs/implementar/arquitetura-midia-e-provedor-whatsapp.md` (schema na §4.2).
--
-- `whatsapp_midia` é o registro por mídia recebida: idempotência do retry da
-- fila, cache do resultado e telemetria de custo (§7.3). Só o TEXTO derivado é
-- gravado — os bytes vivem apenas na memória do Worker durante o processamento
-- (§9), o que mantém foto de documento e comprovante fora do nosso storage.
--
-- `wamid` é PRIMARY KEY porque é a chave natural de idempotência (§8.2): a fila
-- é at-least-once e uma retentativa que encontra `status = 'concluido'`
-- reaproveita `texto` em vez de pagar a OpenAI de novo. É a terceira camada de
-- idempotência — `whatsapp_mensagens_recebidas` cobre a reentrega da Meta,
-- `whatsapp_midia_claim` cobre a entrega dupla da fila, e `concluido` + `texto`
-- cobrem o sucesso parcial (transcreveu, falhou ao gravar no buffer).
--
-- Esta migration entrega só o schema e o claim; o produtor, o consumer e a fila
-- vêm nas fases 5–6 e não dependem de migration nova.
-- =====================================================================================

BEGIN;

-- ─── whatsapp_midia ───────────────────────────────────────────────────────────
-- `status` cobre o ciclo inteiro, inclusive as recusas síncronas do produtor
-- (§7.4): 'recusado' é a mídia que nunca chega a ser processada (recurso
-- desligado, tipo não suportado, tamanho acima do limite) e mesmo assim recebe
-- resposta ao cliente. Sem esse valor, a regra "nenhuma mensagem sem resposta"
-- (§2) não teria registro em produção.
CREATE TABLE IF NOT EXISTS public.whatsapp_midia (
  wamid          text        NOT NULL PRIMARY KEY,
  telefone       text        NOT NULL,
  tipo           text        NOT NULL,          -- 'audio' | 'image'
  media_id       text        NOT NULL,
  mime_type      text,
  tamanho_bytes  integer,
  status         text        NOT NULL DEFAULT 'pendente'
                 CHECK (status IN ('pendente','processando','concluido','falhou','recusado')),
  texto          text,                          -- transcrição ou descrição
  erro           text,
  modelo         text,
  duracao_ms     integer,
  tentativas     integer     NOT NULL DEFAULT 0,
  criado_em      timestamptz NOT NULL DEFAULT now(),
  atualizado_em  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_midia_status
  ON public.whatsapp_midia (status, criado_em DESC);

-- RLS habilitada SEM policy: acesso exclusivo por `service_role` (que bypassa
-- RLS), mesmo padrão de `whatsapp_conversas` e `integration_idempotency`.
-- Nenhum cliente autenticado tem motivo para ler transcrição de mídia alheia.
ALTER TABLE public.whatsapp_midia ENABLE ROW LEVEL SECURITY;

-- ─── whatsapp_midia_claim: claim atômico da fila de mídia ─────────────────────
-- Mesmo papel de `claimBurstBuffer` (agente §4): um único statement com WHERE e
-- RETURNING decide quem processa. Duas entregas concorrentes do mesmo `wamid`
-- disputam a mesma linha; a segunda encontra `status = 'processando'`, não casa
-- o WHERE e recebe zero linhas — no-op, sem chamar a OpenAI duas vezes.
--
-- O statement é UPDATE, e não o `INSERT ... ON CONFLICT DO UPDATE` esboçado na
-- §4.2, por uma razão de contrato: a mensagem da fila carrega só o `wamid`
-- (§5.2 — Cloudflare Queues limita a 128 KB, então nem os bytes nem os metadados
-- viajam nela), e `telefone`, `tipo` e `media_id` são NOT NULL de posse do
-- produtor, que já inseriu a linha como 'pendente' antes de enfileirar. Um
-- INSERT de duas colunas violaria NOT NULL (23502) sempre que o wamid fosse
-- desconhecido, transformando um no-op esperado em erro que estoura a DLQ. As
-- propriedades que a §4.2 exige — atomicidade, WHERE de estado, teto de
-- tentativas, RETURNING — são as mesmas nas duas formas.
--
-- O UPDATE leva WHERE (aqui isso é redundante com a lógica, mas é regra): a
-- Supabase carrega `pg-safeupdate` e aborta UPDATE sem WHERE com `21000`,
-- inclusive dentro de SECURITY DEFINER. Já custou os incidentes das migrations
-- 038/075 e 090.
--
-- 'falhou' é reclaimável (a falha pode ter sido transitória — rede, 5xx da
-- OpenAI); 'concluido' e 'recusado' não são, e é justamente aí que o retry
-- reaproveita o `texto` já pago em vez de reprocessar.
CREATE OR REPLACE FUNCTION public.whatsapp_midia_claim(
  p_wamid          text,
  p_max_tentativas integer
)
RETURNS TABLE (
  wamid         text,
  telefone      text,
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
  RETURNING m.wamid, m.telefone, m.tipo, m.media_id, m.mime_type, m.tamanho_bytes, m.tentativas;
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.whatsapp_midia_claim(text, integer) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.whatsapp_midia_claim(text, integer) TO service_role;

COMMIT;

-- =====================================================================================
-- DOWN (rollback manual):
--   DROP FUNCTION IF EXISTS public.whatsapp_midia_claim(text, integer);
--   DROP TABLE IF EXISTS public.whatsapp_midia;
-- =====================================================================================
