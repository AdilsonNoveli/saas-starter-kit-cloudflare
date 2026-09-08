-- ─────────────────────────────────────────────────────────────────────────────
-- 102 — `loja` passa a ser fisicamente singleton
--
-- POR QUE: a aplicação inteira já tratava `loja` como linha única, mas nada no
-- banco garantia. Em produção havia QUATRO linhas (medido em 2026-07-31), e
-- TODOS os leitores usam `LIMIT 1` **sem `ORDER BY`** — no servidor
-- (`resolveAgentRuntimeConfig`, `resolveWebhookRuntimeConfig`, `finalizeCheckout`,
-- `availability`, `geocodeAddress`, `archiveOrders`, `getOrderDetail`,
-- `getCustomerContext`, `webhook/cache`) e dentro dos próprios RPCs plpgsql
-- (090, 092, 093 fazem `SELECT id FROM public.loja LIMIT 1`).
--
-- O Postgres não promete ordem sem `ORDER BY`, e ela muda depois de cada
-- `UPDATE`. O efeito era sorteio: só uma das quatro linhas tinha
-- `agente_openai_key_id` e `whatsapp_api_key_id`, então `resolveAgentRuntimeConfig`
-- devolvia `agent: null` sempre que a leitura caía nas outras três — agente mudo,
-- de forma intermitente e sem causa aparente. O RPC que GRAVA a chave sorteava a
-- linha de destino de novo, o que foi como as credenciais acabaram numa só.
--
-- A CORREÇÃO É A INVARIANTE, NÃO O `ORDER BY`. Com exatamente uma linha, todo
-- `LIMIT 1` do sistema vira exato — inclusive os que estão dentro de função
-- plpgsql, que não seriam alcançados por mudança de código no servidor.
--
-- Índice único sobre uma expressão constante: só uma linha satisfaz `(true)`,
-- então o segundo `INSERT` falha em vez de duplicar em silêncio. É o que a regra
-- do produto diz — "cada loja tem sempre um endereço, apenas; mudar dado é
-- UPDATE, nunca INSERT".
--
-- Idempotente. As três linhas duplicadas foram removidas em 2026-07-31 com
-- `WHERE` explícito por id (pg-safeupdate, §5 item 2), preservando
-- `c9833738-2c07-459f-8395-131846fc5f2c`, a única que tinha as duas credenciais.
-- ─────────────────────────────────────────────────────────────────────────────

-- Falha cedo e com mensagem útil se ainda houver duplicata: criar o índice sem
-- limpar antes daria um erro de violação de unicidade sem dizer o porquê.
DO $$
DECLARE
  v_total integer;
BEGIN
  SELECT count(*) INTO v_total FROM public.loja;
  IF v_total > 1 THEN
    RAISE EXCEPTION
      'Existem % linhas em public.loja. Decida qual fica (a que tem agente_openai_key_id e whatsapp_api_key_id) e apague as demais com WHERE explícito por id antes de aplicar esta migration.',
      v_total;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS loja_linha_unica_idx
  ON public.loja ((true));

COMMENT ON INDEX public.loja_linha_unica_idx IS
  'Garante linha única em `loja` (migration 102). Toda a aplicação lê com LIMIT 1 sem ORDER BY, incluindo RPCs plpgsql; com mais de uma linha a leitura vira sorteio. Configuração da loja se ATUALIZA, nunca se insere de novo.';
