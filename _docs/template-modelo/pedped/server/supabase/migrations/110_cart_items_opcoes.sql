-- =====================================================================================
-- MIGRATION: Opções/variações de produto no carrinho do agente
-- Versão: 110
-- =====================================================================================
-- CONTEXTO: sistema de opções (produto_opcao_grupo/produto_opcao_item →
-- itens_pedido_opcoes) já existe completo, usado pelo catálogo web e pelo PDV
-- admin (orders/create.post.ts) — mas o carrinho do agente de WhatsApp
-- (cart_items) nunca ganhou onde guardar a seleção, e a RPC search_products
-- (a única que BuscarProdutos chama) é a ÚNICA RPC de produto do sistema que
-- não devolve tem_opcoes. Sem os dois, o agente não tem como saber que a
-- opção existe nem onde gravar a escolha do cliente (ex.: borda recheada de
-- pizza, "sem cebola", tamanho/cor de roupa).
--
-- cart_items_opcoes espelha itens_pedido_opcoes (mesmo padrão de integridade
-- financeira: nome/preço CONGELADOS no momento da escolha, nunca confiando no
-- que o modelo mandar — setCartItem.ts relê produto_opcao_item no servidor).
--
-- opcoes_assinatura resolve um problema de identidade: "Pizza sem cebola" e
-- "Pizza com borda catupiry" são o MESMO produto_id mas devem ser LINHAS
-- distintas do carrinho. A UNIQUE antiga (sessao_id, produto_id) tratava as
-- duas como o mesmo item. A assinatura é uma string estável (opcao_item_id
-- ordenados e concatenados) calculada pelo SERVIDOR em setCartItem.ts — nunca
-- uma coluna GENERATED do Postgres, porque depende de dado da tabela filha.
-- =====================================================================================

BEGIN;

-- ─── cart_items: assinatura da combinação de opções + nova UNIQUE ──────────
ALTER TABLE public.cart_items
  ADD COLUMN IF NOT EXISTS opcoes_assinatura text NOT NULL DEFAULT '';

COMMENT ON COLUMN public.cart_items.opcoes_assinatura IS
  'Opcao_item_ids ordenados e concatenados (ex.: "id1,id2"), calculado pelo servidor em setCartItem.ts a partir das opções validadas — string vazia para produto sem opção (comportamento idêntico ao de antes da 110). Parte da UNIQUE junto com sessao_id/produto_id: permite duas variações do mesmo produto como linhas distintas do carrinho.';

ALTER TABLE public.cart_items
  DROP CONSTRAINT IF EXISTS cart_items_sessao_produto_unique;
ALTER TABLE public.cart_items
  ADD CONSTRAINT cart_items_sessao_produto_opcoes_unique
  UNIQUE (sessao_id, produto_id, opcoes_assinatura);

-- ─── cart_items_opcoes: opção selecionada por linha do carrinho ────────────
-- Mesmo formato de itens_pedido_opcoes (3.18 em init.sql), FK para cart_items
-- em vez de itens_pedido — nome/preço CONGELADOS no momento da adição.
CREATE TABLE IF NOT EXISTS public.cart_items_opcoes (
  id                    uuid    NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cart_item_id          uuid    NOT NULL REFERENCES public.cart_items(id) ON DELETE CASCADE,
  opcao_item_id         uuid    REFERENCES public.produto_opcao_item(id),
  nome_congelado        text    NOT NULL,
  preco_delta_congelado numeric NOT NULL DEFAULT 0,
  criado_em             timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cart_items_opcoes_cart_item
  ON public.cart_items_opcoes (cart_item_id);

ALTER TABLE public.cart_items_opcoes ENABLE ROW LEVEL SECURITY;

-- Deny-all explícito (mesmo padrão de cart_items — só service_role acessa,
-- nunca anon/authenticated direto).
DROP POLICY IF EXISTS "No client access" ON public.cart_items_opcoes;
CREATE POLICY "No client access" ON public.cart_items_opcoes
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

-- ─── search_products: tem_opcoes (mesmo EXISTS de search_admin_products) ──
-- DROP explícito porque Postgres não deixa CREATE OR REPLACE mudar o formato
-- de RETURNS TABLE (mesma situação da whatsapp_midia_claim na migration 107).
DROP FUNCTION IF EXISTS public.search_products(text, integer, integer);
CREATE FUNCTION public.search_products(p_term text, p_lim integer DEFAULT 20, p_off integer DEFAULT 0)
RETURNS TABLE(id uuid, nome text, descricao text, preco_venda numeric, preco_promocional numeric, unidade_medida text, categoria_nome text, tem_opcoes boolean)
LANGUAGE plpgsql
STABLE
SET search_path TO 'public', 'extensions', 'pg_catalog'
AS $$
DECLARE
  v_clean_term text;
  v_tokens     text[];
BEGIN
  v_clean_term := public.f_unaccent(lower(trim(COALESCE(p_term, ''))));

  IF v_clean_term = '' THEN
    RETURN;
  END IF;

  SELECT array_agg(t) INTO v_tokens
  FROM unnest(regexp_split_to_array(v_clean_term, '\s+')) t
  WHERE length(t) > 0;

  IF v_tokens IS NULL OR array_length(v_tokens, 1) IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH candidato AS (
    SELECT
      p.id,
      p.nome,
      p.descricao,
      p.preco_venda,
      p.preco_promocional,
      p.unidade_medida::text,
      c.nome AS categoria_nome,
      EXISTS (
        SELECT 1 FROM public.produto_opcao_grupo pog WHERE pog.produto_id = p.id
      ) AS tem_opcoes,
      public.f_unaccent(lower(
        p.nome || ' ' ||
        COALESCE(p.descricao, '') || ' ' ||
        COALESCE(c.nome, '') || ' ' ||
        public.f_array_to_string(p.sinonimos)
      )) AS haystack,
      public.f_unaccent(lower(p.nome)) AS nome_clean,
      public.f_array_to_string(p.sinonimos) AS sinonimos_str
    FROM public.produtos p
    LEFT JOIN public.categorias c ON c.id = p.categoria_id
    WHERE p.disponivel = true
  )
  SELECT
    cand.id,
    cand.nome,
    cand.descricao,
    cand.preco_venda,
    cand.preco_promocional,
    cand.unidade_medida,
    cand.categoria_nome,
    cand.tem_opcoes
  FROM candidato cand
  WHERE
    NOT EXISTS (
      SELECT 1
      FROM unnest(v_tokens) tok
      WHERE NOT (
        cand.haystack LIKE '%' || tok || '%'
        OR extensions.word_similarity(tok, cand.haystack) >= 0.35
      )
    )
  ORDER BY
    (
      CASE
        WHEN cand.nome_clean = v_clean_term THEN 1000
        WHEN cand.sinonimos_str LIKE '%' || v_clean_term || '%' THEN 800
        WHEN cand.nome_clean LIKE '%' || v_clean_term || '%' THEN 600
        WHEN cand.haystack LIKE '%' || v_clean_term || '%' THEN 400
        ELSE 100
      END +
      (extensions.word_similarity(v_clean_term, cand.haystack) * 100)::integer
    ) DESC,
    cand.nome ASC
  LIMIT  GREATEST(1, LEAST(p_lim, 100))
  OFFSET GREATEST(0, p_off);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.search_products(text, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.search_products(text, integer, integer) TO service_role;

-- ─── loja.agente_tools_habilitadas: soma a tool nova, sem tirar nada ───────
-- DEFAULT novo vale só para linha nova; loja já migrada tem o array antigo
-- gravado como DADO, não como default — precisa do UPDATE para a tool nova
-- aparecer ativa sem exigir que o lojista vá reconfigurar em Agente IA.
ALTER TABLE public.loja
  ALTER COLUMN agente_tools_habilitadas
  SET DEFAULT '["BuscarProdutos","DefinirItemCarrinho","ConsultarEnderecoEntrega","AtualizarPedido","FinalizarPedido","ConsultarDetalhePedido","EnviarBotaoCatalogo","ConsultarDatasEncomenda","AtualizarContexto","ConsultarOpcoesProduto"]'::jsonb;

UPDATE public.loja
   SET agente_tools_habilitadas = agente_tools_habilitadas || '["ConsultarOpcoesProduto"]'::jsonb
 WHERE NOT (agente_tools_habilitadas @> '["ConsultarOpcoesProduto"]'::jsonb);

COMMIT;

-- =====================================================================================
-- DOWN (rollback manual):
--   -- Reverte search_products ao formato sem tem_opcoes (ver init.sql pré-110
--   -- para o corpo completo da versão anterior).
--   DROP POLICY IF EXISTS "No client access" ON public.cart_items_opcoes;
--   DROP TABLE IF EXISTS public.cart_items_opcoes;
--   ALTER TABLE public.cart_items DROP CONSTRAINT IF EXISTS cart_items_sessao_produto_opcoes_unique;
--   ALTER TABLE public.cart_items ADD CONSTRAINT cart_items_sessao_produto_unique UNIQUE (sessao_id, produto_id);
--   ALTER TABLE public.cart_items DROP COLUMN IF EXISTS opcoes_assinatura;
--   -- agente_tools_habilitadas: reverter manualmente removendo "ConsultarOpcoesProduto"
--   -- das linhas de loja que o ganharam pelo UPDATE acima, se necessário.
-- =====================================================================================
