-- =====================================================================================
-- MIGRATION: Gestão de Estoque — políticas por produto, insumo, consumo atômico
-- Versão: 111
-- =====================================================================================
-- CONTEXTO (ver _docs/plano-estoque.md para o racional completo): `produtos.
-- estoque_atual` existia no schema mas era morto — nunca escrito, nunca
-- decrementado numa venda, sem gate de venda algum além de `disponivel`. Isso
-- já causou um bug real de produção: o agente de IA inventou um limite de
-- quantidade ("o máximo é 10 unidades") porque não existia nenhum dado real de
-- estoque pra ele consultar (ver QUANTITY_LIMITS_NOTE em systemPrompt.ts).
--
-- Esta migration reaproveita `estoque_atual` (política 'contagem'), acrescenta
-- 'producao_diaria' (capacidade por dia, sem contador persistente — mesmo
-- padrão de `reserve_preorders`/`preorders`, migration 078) e um estoque de
-- insumo (matéria-prima) com consumo automático via receita
-- (`produto_insumos`). `estoque_movimentacoes` é a trilha de auditoria e,
-- para 'producao_diaria', a própria fonte de verdade (SUM do dia).
--
-- Deliberadamente NÃO reaproveita a tabela `preorders`/função
-- `reserve_preorders`: `reserve_preorders` rejeita qualquer produto que não
-- seja `product_type='preorder'`, e os leitores de `preorders` (painel
-- /admin/preorders) tratam toda linha como encomenda agendável — forçar
-- "produção diária" (pronta entrega, capacidade do dia) para dentro dessa
-- tabela quebraria os dois. O PADRÃO é reaproveitado (ledger + SUM por
-- período + FOR UPDATE + exceção nomeada), não a tabela.
-- =====================================================================================

BEGIN;

-- ─── 1. produtos: política de estoque por produto ────────────────────────────
ALTER TABLE public.produtos
  ADD COLUMN IF NOT EXISTS controle_estoque text NOT NULL DEFAULT 'nenhum',
  ADD COLUMN IF NOT EXISTS estoque_minimo numeric,
  ADD COLUMN IF NOT EXISTS producao_diaria_limite numeric;

ALTER TABLE public.produtos
  ADD CONSTRAINT produtos_controle_estoque_check
    CHECK (controle_estoque IN ('nenhum', 'contagem', 'producao_diaria'));

-- estoque_atual nunca teve CHECK >= 0 (era campo morto) — necessário agora que
-- passa a ser decrementado por consumir_estoque_pedido.
ALTER TABLE public.produtos
  ADD CONSTRAINT produtos_estoque_atual_nao_negativo CHECK (estoque_atual IS NULL OR estoque_atual >= 0);

COMMENT ON COLUMN public.produtos.controle_estoque IS
  '''nenhum'' (default, comportamento de sempre) | ''contagem'' (estoque_atual é a contagem viva) | ''producao_diaria'' (producao_diaria_limite por dia, sem contador persistente — usa SUM de estoque_movimentacoes, mesmo padrão de reserve_preorders).';
COMMENT ON COLUMN public.produtos.producao_diaria_limite IS
  'Capacidade de produção do dia (unidades). Só usado quando controle_estoque=''producao_diaria''. Reseta sozinho todo dia — não há contador persistente.';
COMMENT ON COLUMN public.produtos.estoque_minimo IS
  'Limiar de alerta de estoque baixo. NULL = sem alerta. Usado por controle_estoque=''contagem'' (produto) e também pela tabela insumos (mesma semântica).';

-- ─── 2. insumos (matéria-prima) — não é produto, ciclo de vida próprio ───────
CREATE TABLE IF NOT EXISTS public.insumos (
  id             uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome           text NOT NULL,
  unidade_medida public.unidade_medida_enum NOT NULL DEFAULT 'unidade',
  estoque_atual  numeric NOT NULL DEFAULT 0 CHECK (estoque_atual >= 0),
  estoque_minimo numeric,
  ativo          boolean NOT NULL DEFAULT true,
  criado_em      timestamptz NOT NULL DEFAULT now(),
  atualizado_em  timestamptz NOT NULL DEFAULT now()
);

-- ─── 3. produto_insumos — receita/BOM: consumo por unidade vendida ───────────
CREATE TABLE IF NOT EXISTS public.produto_insumos (
  produto_id             uuid NOT NULL REFERENCES public.produtos(id) ON DELETE CASCADE,
  insumo_id              uuid NOT NULL REFERENCES public.insumos(id) ON DELETE CASCADE,
  quantidade_por_unidade numeric NOT NULL CHECK (quantidade_por_unidade > 0),
  PRIMARY KEY (produto_id, insumo_id)
);

-- ─── 4. estoque_movimentacoes — trilha de auditoria + fonte de SUM diário ────
CREATE TABLE IF NOT EXISTS public.estoque_movimentacoes (
  id             uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo_entidade  text NOT NULL CHECK (tipo_entidade IN ('produto', 'insumo')),
  entidade_id    uuid NOT NULL,
  tipo_movimento text NOT NULL CHECK (tipo_movimento IN ('entrada', 'saida', 'ajuste', 'venda', 'cancelamento')),
  quantidade     numeric NOT NULL,
  motivo         text,
  pedido_id      uuid REFERENCES public.pedidos(id) ON DELETE CASCADE,
  usuario_id     uuid REFERENCES public.usuarios(id),
  criado_em      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_estoque_movimentacoes_entidade
  ON public.estoque_movimentacoes (tipo_entidade, entidade_id, criado_em DESC);

COMMENT ON COLUMN public.estoque_movimentacoes.quantidade IS
  'Delta assinado: positivo = entrada/cancelamento (devolve), negativo = saida/venda (consome).';

-- ─── 5. RLS — mesmo padrão de itens_pedido_opcoes (staff gerencia, anon nada).
-- `private.is_staff()` (migration 038), NUNCA `public.is_staff()` — a versão
-- pública foi movida para o schema private e o `public.is_staff()` foi
-- dropado nessa mesma migration (ver comentário idêntico em 095_customer_intelligence.sql).
ALTER TABLE public.insumos                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produto_insumos        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estoque_movimentacoes  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff manage insumos" ON public.insumos;
CREATE POLICY "Staff manage insumos" ON public.insumos
  FOR ALL TO authenticated
  USING     (private.is_staff())
  WITH CHECK(private.is_staff());

DROP POLICY IF EXISTS "Staff manage produto_insumos" ON public.produto_insumos;
CREATE POLICY "Staff manage produto_insumos" ON public.produto_insumos
  FOR ALL TO authenticated
  USING     (private.is_staff())
  WITH CHECK(private.is_staff());

DROP POLICY IF EXISTS "Staff manage estoque_movimentacoes" ON public.estoque_movimentacoes;
CREATE POLICY "Staff manage estoque_movimentacoes" ON public.estoque_movimentacoes
  FOR ALL TO authenticated
  USING     (private.is_staff())
  WITH CHECK(private.is_staff());

-- ─── 6. consumir_estoque_pedido — núcleo atômico, mesmo esqueleto de
-- reserve_preorders (FOR UPDATE por linha + exceção nomeada + tudo na mesma
-- transação de quem chama). p_itens: jsonb array com {produto_id, quantidade}
-- (aceita qualquer objeto com essas duas chaves — é o mesmo payload já usado
-- pelo INSERT em itens_pedido nos dois pontos de criação de pedido).
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.consumir_estoque_pedido(p_pedido_id uuid, p_itens jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_item       jsonb;
  v_produto_id uuid;
  v_qty        numeric;
  v_produto    record;
  v_used       numeric;
  v_insumo     record;
  v_hoje       date := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
BEGIN
  IF p_itens IS NULL OR jsonb_typeof(p_itens) <> 'array' THEN
    RETURN;
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_itens) LOOP
    v_produto_id := (v_item->>'produto_id')::uuid;
    v_qty        := (v_item->>'quantidade')::numeric;

    IF v_produto_id IS NULL OR v_qty IS NULL OR v_qty <= 0 THEN
      CONTINUE;
    END IF;

    SELECT id, controle_estoque, estoque_atual, producao_diaria_limite
      INTO v_produto
      FROM public.produtos
     WHERE id = v_produto_id
     FOR UPDATE;

    IF v_produto.id IS NULL THEN
      CONTINUE;
    END IF;

    IF v_produto.controle_estoque = 'contagem' THEN
      IF v_produto.estoque_atual IS NULL OR v_produto.estoque_atual < v_qty THEN
        RAISE EXCEPTION 'ESTOQUE_INSUFICIENTE' USING ERRCODE = 'check_violation',
          DETAIL = format('Produto %s tem %s unidade(s) em estoque, pedido pede %s.',
            v_produto_id, COALESCE(v_produto.estoque_atual, 0), v_qty);
      END IF;

      UPDATE public.produtos SET estoque_atual = estoque_atual - v_qty WHERE id = v_produto_id;

      INSERT INTO public.estoque_movimentacoes (tipo_entidade, entidade_id, tipo_movimento, quantidade, pedido_id)
      VALUES ('produto', v_produto_id, 'venda', -v_qty, p_pedido_id);

    ELSIF v_produto.controle_estoque = 'producao_diaria' THEN
      -- Usado hoje = -(SUM de venda+cancelamento do dia): cancelamento (positivo)
      -- neutraliza a venda (negativo) que reverteu, sem contador persistente —
      -- mesma elegância de reserve_preorders (SUM por período em vez de coluna).
      SELECT COALESCE(-SUM(quantidade), 0) INTO v_used
        FROM public.estoque_movimentacoes
       WHERE tipo_entidade = 'produto'
         AND entidade_id = v_produto_id
         AND tipo_movimento IN ('venda', 'cancelamento')
         AND (criado_em AT TIME ZONE 'America/Sao_Paulo')::date = v_hoje;

      IF v_produto.producao_diaria_limite IS NULL OR v_used + v_qty > v_produto.producao_diaria_limite THEN
        RAISE EXCEPTION 'PRODUCAO_DIARIA_ESGOTADA' USING ERRCODE = 'check_violation',
          DETAIL = format('Produção de hoje para %s: %s/%s já usado.',
            v_produto_id, v_used, COALESCE(v_produto.producao_diaria_limite, 0));
      END IF;

      INSERT INTO public.estoque_movimentacoes (tipo_entidade, entidade_id, tipo_movimento, quantidade, pedido_id)
      VALUES ('produto', v_produto_id, 'venda', -v_qty, p_pedido_id);
    END IF;
    -- controle_estoque = 'nenhum' → não decrementa nada (default, comportamento
    -- de sempre); o consumo de insumo abaixo ainda roda para QUALQUER política.

    FOR v_insumo IN
      SELECT pi.insumo_id, pi.quantidade_por_unidade, i.estoque_atual AS estoque_insumo, i.nome AS nome_insumo
        FROM public.produto_insumos pi
        JOIN public.insumos i ON i.id = pi.insumo_id
       WHERE pi.produto_id = v_produto_id
       FOR UPDATE OF i
    LOOP
      IF v_insumo.estoque_insumo < v_insumo.quantidade_por_unidade * v_qty THEN
        RAISE EXCEPTION 'INSUMO_INSUFICIENTE' USING ERRCODE = 'check_violation',
          DETAIL = format('Insumo %s: %s em estoque, pedido precisa de %s.',
            v_insumo.nome_insumo, v_insumo.estoque_insumo, v_insumo.quantidade_por_unidade * v_qty);
      END IF;

      UPDATE public.insumos
         SET estoque_atual = estoque_atual - (v_insumo.quantidade_por_unidade * v_qty)
       WHERE id = v_insumo.insumo_id;

      INSERT INTO public.estoque_movimentacoes (tipo_entidade, entidade_id, tipo_movimento, quantidade, pedido_id)
      VALUES ('insumo', v_insumo.insumo_id, 'venda', -(v_insumo.quantidade_por_unidade * v_qty), p_pedido_id);
    END LOOP;
  END LOOP;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.consumir_estoque_pedido(uuid, jsonb) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.consumir_estoque_pedido(uuid, jsonb) TO service_role;

-- ─── 7. estornar_estoque_pedido — compensação em cancelamento ────────────────
-- Reverte toda movimentação 'venda' gravada para o pedido: devolve estoque_atual
-- (só quando o produto ainda está em controle_estoque='contagem' hoje — se a
-- política mudou depois da venda, não mexe no contador de uma política que já
-- não se aplica) e sempre devolve insumo. Para 'producao_diaria' não precisa
-- tocar em nenhum contador: a linha 'cancelamento' inserida aqui já neutraliza
-- a 'venda' na próxima SUM do dia (mesmo cálculo de consumir_estoque_pedido).
CREATE OR REPLACE FUNCTION public.estornar_estoque_pedido(p_pedido_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_mov record;
BEGIN
  FOR v_mov IN
    SELECT tipo_entidade, entidade_id, quantidade
      FROM public.estoque_movimentacoes
     WHERE pedido_id = p_pedido_id
       AND tipo_movimento = 'venda'
     ORDER BY criado_em
  LOOP
    IF v_mov.tipo_entidade = 'produto' THEN
      UPDATE public.produtos
         SET estoque_atual = estoque_atual - v_mov.quantidade  -- quantidade é negativa: subtrair devolve
       WHERE id = v_mov.entidade_id
         AND controle_estoque = 'contagem';
    ELSIF v_mov.tipo_entidade = 'insumo' THEN
      UPDATE public.insumos
         SET estoque_atual = estoque_atual - v_mov.quantidade
       WHERE id = v_mov.entidade_id;
    END IF;

    INSERT INTO public.estoque_movimentacoes (tipo_entidade, entidade_id, tipo_movimento, quantidade, pedido_id)
    VALUES (v_mov.tipo_entidade, v_mov.entidade_id, 'cancelamento', -v_mov.quantidade, p_pedido_id);
  END LOOP;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.estornar_estoque_pedido(uuid) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.estornar_estoque_pedido(uuid) TO service_role;

-- ─── 8. create_integration_order — chama consumir_estoque_pedido na mesma
-- transação, logo após a reserva de encomenda (mesma assinatura exata da
-- migration 086 — CREATE OR REPLACE só troca o corpo). ────────────────────────
CREATE OR REPLACE FUNCTION public.create_integration_order(
  p_idempotency_key   text,
  p_cliente_id        uuid,
  p_tipo_entrega      public.tipo_entrega_enum,
  p_forma_pagamento   public.forma_pagamento_enum,
  p_status            text,
  p_itens             jsonb,
  p_endereco_id       uuid    DEFAULT NULL,
  p_endereco_novo     jsonb   DEFAULT NULL,
  p_sessao_id         uuid    DEFAULT NULL,
  p_observacoes       text    DEFAULT NULL,
  p_nota_operacional  text    DEFAULT NULL,
  p_desconto_aplicado numeric DEFAULT 0,
  p_valor_entrega     numeric DEFAULT 0,
  p_frete_gratis      boolean DEFAULT false,
  p_preorder_items    jsonb   DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path TO 'public', 'pg_catalog'
AS $function$
DECLARE
  v_inserted    integer;
  v_existing    text;
  v_endereco_id uuid := p_endereco_id;
  v_pedido_id   uuid;
  v_subtotal    numeric;
  v_total       numeric;
  v_has_key     boolean := p_idempotency_key IS NOT NULL AND p_idempotency_key <> '';
BEGIN
  IF v_has_key THEN
    INSERT INTO public.integration_idempotency (key, status, payload)
    VALUES (p_idempotency_key, 'processing', NULL)
    ON CONFLICT (key) DO NOTHING;
    GET DIAGNOSTICS v_inserted = ROW_COUNT;

    IF v_inserted = 0 THEN
      SELECT payload->>'pedido_id' INTO v_existing
      FROM public.integration_idempotency
      WHERE key = p_idempotency_key;

      IF v_existing IS NOT NULL THEN
        SELECT valor_subtotal, valor_total INTO v_subtotal, v_total
        FROM public.pedidos WHERE id = v_existing::uuid;
        RETURN jsonb_build_object(
          'outcome', 'replay',
          'pedido_id', v_existing,
          'subtotal', COALESCE(v_subtotal, 0),
          'total', COALESCE(v_total, 0)
        );
      END IF;

      RETURN jsonb_build_object('outcome', 'in_flight');
    END IF;
  END IF;

  IF p_endereco_novo IS NOT NULL THEN
    INSERT INTO public.enderecos_cliente (
      cliente_id, rua, numero, bairro, complemento, cidade, estado, cep, latitude, longitude
    )
    VALUES (
      p_cliente_id,
      p_endereco_novo->>'rua',
      p_endereco_novo->>'numero',
      p_endereco_novo->>'bairro',
      p_endereco_novo->>'complemento',
      p_endereco_novo->>'cidade',
      p_endereco_novo->>'estado',
      p_endereco_novo->>'cep',
      (p_endereco_novo->>'latitude')::numeric,
      (p_endereco_novo->>'longitude')::numeric
    )
    RETURNING id INTO v_endereco_id;
  END IF;

  INSERT INTO public.pedidos (
    cliente_id, sessao_id, endereco_id, tipo_entrega, forma_pagamento,
    observacoes, status, nota_operacional, desconto_aplicado, valor_entrega,
    frete_gratis_aplicado
  )
  VALUES (
    p_cliente_id, p_sessao_id, v_endereco_id, p_tipo_entrega, p_forma_pagamento,
    p_observacoes, p_status, p_nota_operacional, COALESCE(p_desconto_aplicado, 0),
    COALESCE(p_valor_entrega, 0), COALESCE(p_frete_gratis, false)
  )
  RETURNING id INTO v_pedido_id;

  -- Fulfillment por-item (Feature 4.1): delivery_mode/address_id no item jsonb
  -- SÓ quando diverge do padrão do carrinho; ausente = NULL = herda o pedido.
  INSERT INTO public.itens_pedido (pedido_id, produto_id, quantidade, delivery_mode, endereco_id)
  SELECT
    v_pedido_id,
    (item->>'produto_id')::uuid,
    (item->>'quantidade')::numeric,
    NULLIF(item->>'delivery_mode', ''),
    NULLIF(item->>'address_id', '')::uuid
  FROM jsonb_array_elements(p_itens) AS item;

  IF p_preorder_items IS NOT NULL
     AND jsonb_typeof(p_preorder_items) = 'array'
     AND jsonb_array_length(p_preorder_items) > 0 THEN
    PERFORM public.reserve_preorders(v_pedido_id, p_preorder_items);
  END IF;

  -- Gestão de estoque (migration 111): no-op para produto com
  -- controle_estoque='nenhum' — comportamento anterior preservado.
  PERFORM public.consumir_estoque_pedido(v_pedido_id, p_itens);

  IF v_has_key THEN
    UPDATE public.integration_idempotency
    SET status = 'completed', payload = jsonb_build_object('pedido_id', v_pedido_id)
    WHERE key = p_idempotency_key;
  END IF;

  IF p_sessao_id IS NOT NULL THEN
    UPDATE public.sessoes SET status = 'convertida' WHERE id = p_sessao_id;
    DELETE FROM public.cart_items WHERE sessao_id = p_sessao_id;
  END IF;

  SELECT valor_subtotal, valor_total INTO v_subtotal, v_total
  FROM public.pedidos WHERE id = v_pedido_id;

  RETURN jsonb_build_object(
    'outcome', 'created',
    'pedido_id', v_pedido_id,
    'subtotal', COALESCE(v_subtotal, 0),
    'total', COALESCE(v_total, 0)
  );
END;
$function$;

COMMIT;

-- =====================================================================================
-- DOWN (rollback manual):
--   -- reaplicar o corpo da migration 086 em create_integration_order (sem o
--   -- PERFORM consumir_estoque_pedido).
--   DROP FUNCTION IF EXISTS public.estornar_estoque_pedido(uuid);
--   DROP FUNCTION IF EXISTS public.consumir_estoque_pedido(uuid, jsonb);
--   DROP TABLE IF EXISTS public.estoque_movimentacoes;
--   DROP TABLE IF EXISTS public.produto_insumos;
--   DROP TABLE IF EXISTS public.insumos;
--   ALTER TABLE public.produtos DROP CONSTRAINT IF EXISTS produtos_estoque_atual_nao_negativo;
--   ALTER TABLE public.produtos DROP CONSTRAINT IF EXISTS produtos_controle_estoque_check;
--   ALTER TABLE public.produtos DROP COLUMN IF EXISTS producao_diaria_limite;
--   ALTER TABLE public.produtos DROP COLUMN IF EXISTS estoque_minimo;
--   ALTER TABLE public.produtos DROP COLUMN IF EXISTS controle_estoque;
-- =====================================================================================
