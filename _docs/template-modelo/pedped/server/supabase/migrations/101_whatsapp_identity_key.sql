-- =====================================================================================
-- MIGRATION: identidade do turno deixa de ser o telefone
-- Versão: 101
-- =====================================================================================
-- CONTEXTO: `_docs/em-andamento.md`, FASE 0.4, itens (b) e (c). São a MESMA
-- dependência estrutural e por isso vêm juntos: migrar um e deixar o outro não
-- fecha nada.
--
-- O QUE ESTAVA ERRADO
--   A 100 fez o `@lid` atravessar o debounce, mas só para o turno que começa
--   por TEXTO. Duas tabelas continuavam declarando que telefone é identidade:
--
--     `whatsapp_turno_buffer`  PRIMARY KEY (telefone)
--     `whatsapp_midia`         telefone NOT NULL, e sem coluna para o lid
--
--   Consequência medida no código: `processInboundMedia.deliverToTurn` chamava
--   `appendToBurstBuffer` SEM lid — porque não tinha de onde tirá-lo. Turno
--   iniciado por áudio ou imagem nunca gravava `clientes.whatsapp_lid`, e a
--   captura natural do item (a) ficava pela metade.
--
-- ─── A DECISÃO CENTRAL DE (b): chave composta × identidade resolvida ─────────
--   O claim atômico da §4 (`DELETE ... WHERE <chave> AND ultima_msg_id
--   RETURNING`) é o que garante entrega ÚNICA do turno. Ele exige uma chave
--   escalar, estável entre o produtor e o consumer ao longo dos ~8s de
--   debounce. As três opções, e por que sobrou a terceira:
--
--   1. CHAVE COMPOSTA (telefone, whatsapp_lid) — REJEITADA. Em Postgres,
--      coluna de PRIMARY KEY é NOT NULL: uma chave composta não pode ter
--      telefone nulo, que é exatamente o caso que (b) precisa aceitar. E com
--      UNIQUE NULLS DISTINCT o mesmo cliente numa rajada mista (texto com lid,
--      áudio sem) viraria DUAS linhas e DOIS turnos.
--
--   2. IDENTIDADE RESOLVIDA (`clientes.id`) — REJEITADA. Obrigaria o produtor a
--      resolver/criar o cliente dentro do webhook, que hoje "decide, registra e
--      enfileira" e nunca lê `clientes` (§2.3 do plano). Custo: +1 round-trip
--      por MENSAGEM (não por turno), no caminho com contrato de tempo da Meta.
--      E é ativamente perigoso para o claim: o backfill bidirecional de
--      `findOrCreateCustomer` pode fundir cadastros entre o append e o claim —
--      a chave mudaria com o turno em voo, e o claim não casaria mais. Turno
--      perdido em silêncio, o modo de falha caro deste projeto.
--
--   3. IDENTIDADE DO PAYLOAD (adotada): `chave = COALESCE(telefone,
--      'lid:'||whatsapp_lid)`, derivada só do que chegou na mensagem. É
--      escalar, é imutável para a linha, não consulta nada, e o claim continua
--      sendo o mesmo statement de uma linha só. Telefone PRIMEIRO de propósito:
--      todos os 4 payloads reais de `payloads-waba.md` trazem telefone, então
--      para 100% do tráfego de hoje `chave` É o telefone — a migration não muda
--      o comportamento de nenhum turno existente, só admite o turno futuro sem
--      telefone. O prefixo `lid:` existe para que um lid que por acaso pareça
--      um telefone nunca colida com um telefone de verdade.
--
--   Limite aceito e documentado: se o MESMO cliente mandar uma mensagem com
--   telefone e outra sem, na mesma rajada, saem dois turnos. Isso exige que o
--   provedor omita o telefone em parte das mensagens — não acontece hoje, e a
--   alternativa que resolveria (opção 2) quebra o claim, que é a garantia mais
--   cara do sistema.
--
-- ─── O COALESCE DO ON CONFLICT CONTINUA OBRIGATÓRIO ─────────────────────────
--   Com (c), o consumer de mídia PASSA a conhecer o lid — mas só quando o
--   payload daquela mídia o trouxe. Áudio sem `from_user_id` numa rajada em que
--   o texto trouxe continua sendo possível, e sem o COALESCE esse append
--   rebaixaria o lid para NULL. Mantido, com spec de integração cobrindo a
--   rajada texto+áudio nos dois sentidos.
--
-- ─── whatsapp_midia (item c) ────────────────────────────────────────────────
--   `telefone` deixa de ser NOT NULL, ganha `whatsapp_lid`, e o mesmo CHECK de
--   identidade da 032 (`telefone IS NOT NULL OR whatsapp_lid IS NOT NULL`).
--   `whatsapp_midia_claim` passa a devolver o lid — sem isso a coluna nova
--   morre no banco e `deliverToTurn` continua sem ter o que propagar.
--
-- ATENÇÃO (armadilha nº 1): `CREATE FUNCTION` não valida corpo plpgsql. O bloco
-- de smoke no fim executa os DOIS RPCs dentro desta transação e limpa atrás de
-- si, sempre com `WHERE` (pg-safeupdate, armadilha nº 2).
-- =====================================================================================

BEGIN;

-- ─── whatsapp_turno_buffer: chave por identidade do payload ───────────────────
ALTER TABLE public.whatsapp_turno_buffer
  ADD COLUMN IF NOT EXISTS chave text;

-- Linhas em voo no momento da migration: todas têm telefone (era NOT NULL), e
-- para elas `chave` é o próprio telefone — o claim agendado continua casando.
UPDATE public.whatsapp_turno_buffer
   SET chave = COALESCE(telefone, 'lid:' || whatsapp_lid)
 WHERE chave IS NULL;

ALTER TABLE public.whatsapp_turno_buffer
  ALTER COLUMN chave SET NOT NULL;

ALTER TABLE public.whatsapp_turno_buffer
  DROP CONSTRAINT IF EXISTS whatsapp_turno_buffer_pkey;

ALTER TABLE public.whatsapp_turno_buffer
  ADD CONSTRAINT whatsapp_turno_buffer_pkey PRIMARY KEY (chave);

ALTER TABLE public.whatsapp_turno_buffer
  ALTER COLUMN telefone DROP NOT NULL;

-- Os DOIS checks são necessários, e o segundo NÃO implica o primeiro: com
-- telefone e lid nulos, `chave = COALESCE(NULL, NULL)` avalia para NULL, e um
-- CHECK que resulta em NULL é considerado SATISFEITO. Sem o check de
-- identidade, uma linha sem identificador nenhum passaria.
ALTER TABLE public.whatsapp_turno_buffer
  DROP CONSTRAINT IF EXISTS whatsapp_turno_buffer_identidade_chk;
ALTER TABLE public.whatsapp_turno_buffer
  ADD CONSTRAINT whatsapp_turno_buffer_identidade_chk
  CHECK (telefone IS NOT NULL OR whatsapp_lid IS NOT NULL);

ALTER TABLE public.whatsapp_turno_buffer
  DROP CONSTRAINT IF EXISTS whatsapp_turno_buffer_chave_chk;
ALTER TABLE public.whatsapp_turno_buffer
  ADD CONSTRAINT whatsapp_turno_buffer_chave_chk
  CHECK (chave = COALESCE(telefone, 'lid:' || whatsapp_lid));

COMMENT ON COLUMN public.whatsapp_turno_buffer.chave IS
  'Identidade do turno derivada do payload: telefone quando ele veio, senão ''lid:''||whatsapp_lid. É a chave do claim atômico (DELETE ... WHERE chave AND ultima_msg_id RETURNING) e do ON CONFLICT do append. Escrita só por whatsapp_buffer_append.';
COMMENT ON COLUMN public.whatsapp_turno_buffer.telefone IS
  'Telefone de origem. Nullable desde a migration 101: o turno pode ser identificado só pelo lid. Sem telefone não há caminho de RESPOSTA (o provedor não aceita user_id no envio) — quem trata isso é o consumer.';

-- ─── whatsapp_buffer_append: devolve a chave que o consumer vai reivindicar ───
-- O RPC é o ÚNICO escritor da tabela (grant só para service_role), então ele é
-- o único lugar onde a derivação da chave existe. Devolver `chave` em vez de
-- deixar o produtor recalculá-la evita duas fontes de verdade para a chave do
-- claim — o tipo de divergência que falha em silêncio.
--
-- `RETURNS void` → `RETURNS text` exige DROP: `CREATE OR REPLACE` não muda tipo
-- de retorno (42P13).
DROP FUNCTION IF EXISTS public.whatsapp_buffer_append(text, text, text, text);

CREATE OR REPLACE FUNCTION public.whatsapp_buffer_append(
  p_telefone text,
  p_texto    text,
  p_msg_id   text,
  p_lid      text DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
SET search_path TO 'public', 'pg_catalog'
AS $function$
DECLARE
  v_chave text;
BEGIN
  IF p_telefone IS NULL AND p_lid IS NULL THEN
    -- Mensagem sem identificador nenhum não tem turno possível: não dá para
    -- reivindicar, nem para responder. Falhar aqui é melhor que gravar uma
    -- linha órfã que o claim nunca alcança.
    RAISE EXCEPTION 'whatsapp_buffer_append exige p_telefone ou p_lid';
  END IF;

  v_chave := COALESCE(p_telefone, 'lid:' || p_lid);

  INSERT INTO public.whatsapp_turno_buffer (chave, telefone, textos, ultima_msg_id, whatsapp_lid)
  VALUES (v_chave, p_telefone, jsonb_build_array(p_texto), p_msg_id, p_lid)
  ON CONFLICT (chave) DO UPDATE
  SET textos        = public.whatsapp_turno_buffer.textos || jsonb_build_array(p_texto),
      ultima_msg_id = p_msg_id,
      -- Nunca rebaixa para NULL: o append de mídia só conhece o lid quando o
      -- payload daquela mídia o trouxe (ver cabeçalho).
      whatsapp_lid  = COALESCE(p_lid, public.whatsapp_turno_buffer.whatsapp_lid),
      atualizado_em = now();
  -- `telefone` NÃO é atualizado no conflito de propósito: ele é o que deriva a
  -- chave, e a linha só conflita quando a chave é idêntica. Reescrevê-lo
  -- poderia violar `whatsapp_turno_buffer_chave_chk`.

  RETURN v_chave;
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.whatsapp_buffer_append(text, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.whatsapp_buffer_append(text, text, text, text) TO service_role;

-- ─── whatsapp_midia: mesma dependência estrutural (item c) ────────────────────
ALTER TABLE public.whatsapp_midia
  ADD COLUMN IF NOT EXISTS whatsapp_lid text;

ALTER TABLE public.whatsapp_midia
  ALTER COLUMN telefone DROP NOT NULL;

ALTER TABLE public.whatsapp_midia
  DROP CONSTRAINT IF EXISTS whatsapp_midia_identidade_chk;
ALTER TABLE public.whatsapp_midia
  ADD CONSTRAINT whatsapp_midia_identidade_chk
  CHECK (telefone IS NOT NULL OR whatsapp_lid IS NOT NULL);

COMMENT ON COLUMN public.whatsapp_midia.whatsapp_lid IS
  'Identificador estável do WhatsApp (messages[].from_user_id / contacts[].user_id) da mensagem de mídia. É o que faz o turno iniciado por áudio ou imagem também gravar clientes.whatsapp_lid — antes da 101 esta coluna não existia e deliverToTurn não tinha o que propagar.';

-- `RETURNS TABLE` ganhou coluna: `CREATE OR REPLACE` não altera o tipo de
-- retorno (42P13), então DROP antes. Assinatura de argumentos inalterada — não
-- há o risco de ambiguidade (42725) que a 100 teve.
DROP FUNCTION IF EXISTS public.whatsapp_midia_claim(text, integer);

CREATE OR REPLACE FUNCTION public.whatsapp_midia_claim(
  p_wamid          text,
  p_max_tentativas integer
)
RETURNS TABLE (
  wamid         text,
  telefone      text,
  whatsapp_lid  text,
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
  RETURNING m.wamid, m.telefone, m.whatsapp_lid, m.tipo, m.media_id, m.mime_type, m.tamanho_bytes, m.tentativas;
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.whatsapp_midia_claim(text, integer) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.whatsapp_midia_claim(text, integer) TO service_role;

-- ─── Smoke dos dois RPCs, na mesma transação (armadilha nº 1) ─────────────────
DO $smoke$
DECLARE
  v_chave  text;
  v_lid    text;
  v_claim  record;
BEGIN
  -- (1) append com telefone: a chave É o telefone (comportamento de hoje).
  v_chave := public.whatsapp_buffer_append('__smoke__', 'ping', 'wamid.__smoke1__', 'LID.__smoke__');
  IF v_chave IS DISTINCT FROM '__smoke__' THEN
    RAISE EXCEPTION 'whatsapp_buffer_append devolveu chave inesperada com telefone: %', v_chave;
  END IF;

  -- (2) append sem lid na mesma chave: o COALESCE preserva o lid já gravado.
  PERFORM public.whatsapp_buffer_append('__smoke__', 'pong', 'wamid.__smoke2__');
  SELECT whatsapp_lid INTO v_lid FROM public.whatsapp_turno_buffer WHERE chave = '__smoke__';
  IF v_lid IS NULL THEN
    RAISE EXCEPTION 'whatsapp_buffer_append apagou o lid num append sem p_lid';
  END IF;

  -- (3) append SEM telefone: é o item (b) inteiro — chave prefixada, telefone
  -- nulo aceito pela tabela.
  v_chave := public.whatsapp_buffer_append(NULL, 'so lid', 'wamid.__smoke3__', 'LID.__smoke_only__');
  IF v_chave IS DISTINCT FROM 'lid:LID.__smoke_only__' THEN
    RAISE EXCEPTION 'whatsapp_buffer_append devolveu chave inesperada sem telefone: %', v_chave;
  END IF;

  DELETE FROM public.whatsapp_turno_buffer
   WHERE chave IN ('__smoke__', 'lid:LID.__smoke_only__');

  -- (4) claim de mídia devolvendo o lid — sem isto a coluna nova morre no banco.
  INSERT INTO public.whatsapp_midia (wamid, telefone, whatsapp_lid, tipo, media_id, status)
  VALUES ('wamid.__smoke_midia__', NULL, 'LID.__smoke__', 'audio', 'media.__smoke__', 'pendente');

  SELECT * INTO v_claim FROM public.whatsapp_midia_claim('wamid.__smoke_midia__', 3);
  IF v_claim.whatsapp_lid IS DISTINCT FROM 'LID.__smoke__' THEN
    RAISE EXCEPTION 'whatsapp_midia_claim não devolveu o whatsapp_lid';
  END IF;
  IF v_claim.telefone IS NOT NULL THEN
    RAISE EXCEPTION 'whatsapp_midia_claim devolveu telefone onde a linha é lid-only';
  END IF;

  DELETE FROM public.whatsapp_midia WHERE wamid = 'wamid.__smoke_midia__';
END
$smoke$;

COMMIT;

-- =====================================================================================
-- DOWN (rollback manual — só funciona com a tabela vazia de linhas sem telefone):
--   DELETE FROM public.whatsapp_turno_buffer WHERE telefone IS NULL;
--   DELETE FROM public.whatsapp_midia        WHERE telefone IS NULL;
--   ALTER TABLE public.whatsapp_turno_buffer DROP CONSTRAINT IF EXISTS whatsapp_turno_buffer_chave_chk;
--   ALTER TABLE public.whatsapp_turno_buffer DROP CONSTRAINT IF EXISTS whatsapp_turno_buffer_identidade_chk;
--   ALTER TABLE public.whatsapp_turno_buffer DROP CONSTRAINT IF EXISTS whatsapp_turno_buffer_pkey;
--   ALTER TABLE public.whatsapp_turno_buffer ALTER COLUMN telefone SET NOT NULL;
--   ALTER TABLE public.whatsapp_turno_buffer ADD CONSTRAINT whatsapp_turno_buffer_pkey PRIMARY KEY (telefone);
--   ALTER TABLE public.whatsapp_turno_buffer DROP COLUMN IF EXISTS chave;
--   ALTER TABLE public.whatsapp_midia        DROP CONSTRAINT IF EXISTS whatsapp_midia_identidade_chk;
--   ALTER TABLE public.whatsapp_midia        ALTER COLUMN telefone SET NOT NULL;
--   ALTER TABLE public.whatsapp_midia        DROP COLUMN IF EXISTS whatsapp_lid;
--   -- e recriar as duas funções na forma da migration 100 / 094.
-- =====================================================================================
