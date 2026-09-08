-- =====================================================================================
-- MIGRATION: Pre-Order System (Sistema de Encomendas)
-- Versão: 078
-- =====================================================================================
-- CONTEXTO:
--   Produtos passam a suportar três modos de venda: venda imediata ('stock'),
--   sob encomenda ('preorder') ou ambos ('both'). Uma encomenda é um pedido
--   normal (`pedidos`) acrescido de linhas em `preorders` (data de entrega,
--   quantidade e snapshot das regras vigentes na compra).
--
--   DECISÕES DE ARQUITETURA:
--   1. `preorders` NÃO tem coluna de status próprio: o ciclo de vida da
--      encomenda é o do pedido (kanban_coluna via pedidos.status). Isso mantém
--      uma única fonte de verdade, reutiliza o webhook `pedido.status_alterado`
--      e as automações de entrega sem duplicação.
--   2. Capacidade diária é medida em SUM(quantity) (numeric) — produtos por kg
--      consomem capacidade proporcional — comparada a
--      preorder_config->>'daily_capacity'. Pedidos em colunas is_cancelled não
--      consomem capacidade.
--   3. Anti-overbooking é garantido DENTRO do banco pela RPC
--      `reserve_preorders`: pg_advisory_xact_lock por (produto, data) serializa
--      reservas concorrentes; checagem + INSERT rodam na mesma transação. Dois
--      checkouts simultâneos jamais gravam além da capacidade.
--   4. "Hoje" é calculado em America/Sao_Paulo (UTC-3 fixo — o Brasil aboliu o
--      horário de verão em 2019), alinhado a shared/utils/datetime.ts.
--   5. Dias elegíveis para entrega seguem a grade semanal da loja
--      (loja.config_horarios->dow->>'aberto') e as datas bloqueadas
--      (`preorder_blocked_dates`, global ou por produto).
--   6. `catalog_products_page` é recriada para expor product_type e
--      preorder_config ao catálogo (o frontend precisa saber o tipo de venda).
--
-- IDEMPOTÊNCIA: guards IF NOT EXISTS / OR REPLACE onde aplicável.
-- =====================================================================================

BEGIN;

-- 1. produtos: tipo de venda + configuração de encomenda --------------------------------

ALTER TABLE public.produtos
  ADD COLUMN IF NOT EXISTS product_type text NOT NULL DEFAULT 'stock'
    CONSTRAINT produtos_product_type_check CHECK (product_type IN ('stock','preorder','both')),
  ADD COLUMN IF NOT EXISTS preorder_config jsonb;

COMMENT ON COLUMN public.produtos.product_type IS
  'Modo de venda: stock (imediata), preorder (só encomenda) ou both. Default stock preserva o comportamento de todo o catálogo existente.';
COMMENT ON COLUMN public.produtos.preorder_config IS
  'Regras de encomenda (interface PreorderConfig): scheduling_type, min_quantity, max_quantity, daily_capacity, min_lead_days, max_lead_days. Obrigatório quando product_type <> stock.';

-- 2. preorders --------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.preorders (
  id             uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id       uuid        NOT NULL REFERENCES public.pedidos(id) ON DELETE CASCADE,
  product_id     uuid        NOT NULL REFERENCES public.produtos(id),
  delivery_date  date        NOT NULL,
  quantity       numeric     NOT NULL CHECK (quantity > 0),
  unit           text        NOT NULL,
  rules_snapshot jsonb       NOT NULL,
  created_at     timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.preorders IS
  'Encomendas: uma linha por item encomendado de um pedido. Status = pedidos.status (kanban); sem status próprio por design (fonte única de verdade).';
COMMENT ON COLUMN public.preorders.quantity IS
  'Quantidade encomendada — é o consumo de capacidade do dia (SUM(quantity) vs daily_capacity).';
COMMENT ON COLUMN public.preorders.unit IS
  'Snapshot de produtos.unidade_medida no ato da compra (padrão nome_produto_congelado).';
COMMENT ON COLUMN public.preorders.rules_snapshot IS
  'Snapshot das regras vigentes na compra (interface PreorderRulesSnapshot: PreorderConfig + unit_price).';

CREATE INDEX IF NOT EXISTS idx_preorders_product_date ON public.preorders (product_id, delivery_date);
CREATE INDEX IF NOT EXISTS idx_preorders_delivery_date ON public.preorders (delivery_date);
CREATE INDEX IF NOT EXISTS idx_preorders_order ON public.preorders (order_id);

-- 3. preorder_blocked_dates -------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.preorder_blocked_dates (
  id           uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  blocked_date date        NOT NULL,
  product_id   uuid        REFERENCES public.produtos(id) ON DELETE CASCADE,
  reason       text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.preorder_blocked_dates IS
  'Datas sem entrega de encomendas (feriados, folgas). product_id NULL = bloqueio global.';

-- UNIQUE parcial: um UNIQUE(blocked_date, product_id) simples não deduplica o
-- bloqueio global (NULL nunca conflita com NULL em índice único comum).
CREATE UNIQUE INDEX IF NOT EXISTS uq_preorder_blocked_global
  ON public.preorder_blocked_dates (blocked_date) WHERE product_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_preorder_blocked_product
  ON public.preorder_blocked_dates (blocked_date, product_id) WHERE product_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_preorder_blocked_date ON public.preorder_blocked_dates (blocked_date);

-- 4. RLS --------------------------------------------------------------------------------
-- Painel admin lê/gerencia via useSupabaseClient sob RLS (padrão do kanban);
-- rotas públicas (availability/calendar/checkout) usam service_role (bypass),
-- arquitetura vigente desde a migration 072.

ALTER TABLE public.preorders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.preorder_blocked_dates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff manage preorders" ON public.preorders;
CREATE POLICY "Staff manage preorders" ON public.preorders
  FOR ALL TO authenticated
  USING (private.is_staff())
  WITH CHECK (private.is_staff());

DROP POLICY IF EXISTS "Staff manage preorder_blocked_dates" ON public.preorder_blocked_dates;
CREATE POLICY "Staff manage preorder_blocked_dates" ON public.preorder_blocked_dates
  FOR ALL TO authenticated
  USING (private.is_staff())
  WITH CHECK (private.is_staff());

-- 5. RPC reserve_preorders — reserva atômica anti-overbooking ---------------------------
--
-- p_items: jsonb array de { product_id, delivery_date, quantity }.
-- Toda a validação roda DENTRO da transação da função (defesa em profundidade):
-- o backend TypeScript pré-valida para UX, mas o banco é a autoridade final.
-- Erros usam ERRCODE check_violation com MESSAGE = código estável PREORDER_*
-- (o Nuxt traduz em resposta amigável).

CREATE OR REPLACE FUNCTION public.reserve_preorders(p_order_id uuid, p_items jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_item          jsonb;
  v_product_id    uuid;
  v_date          date;
  v_qty           numeric;
  v_produto       record;
  v_cfg           jsonb;
  v_capacity      numeric;
  v_min_qty       numeric;
  v_max_qty       numeric;
  v_min_lead      integer;
  v_max_lead      integer;
  v_used          numeric;
  v_today         date := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
  v_dow           text;
  v_horarios      jsonb;
BEGIN
  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'PREORDER_INVALID_PAYLOAD' USING ERRCODE = 'check_violation';
  END IF;

  SELECT config_horarios INTO v_horarios FROM public.loja LIMIT 1;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_product_id := (v_item->>'product_id')::uuid;
    v_date       := (v_item->>'delivery_date')::date;
    v_qty        := (v_item->>'quantity')::numeric;

    IF v_product_id IS NULL OR v_date IS NULL OR v_qty IS NULL OR v_qty <= 0 THEN
      RAISE EXCEPTION 'PREORDER_INVALID_PAYLOAD' USING ERRCODE = 'check_violation';
    END IF;

    SELECT id, product_type, preorder_config, unidade_medida,
           COALESCE(preco_promocional, preco_venda) AS unit_price
      INTO v_produto
      FROM public.produtos
     WHERE id = v_product_id;

    IF v_produto.id IS NULL OR v_produto.product_type NOT IN ('preorder','both')
       OR v_produto.preorder_config IS NULL THEN
      RAISE EXCEPTION 'PREORDER_INVALID_PRODUCT' USING ERRCODE = 'check_violation',
        DETAIL = format('Produto %s não aceita encomenda.', v_product_id);
    END IF;

    v_cfg      := v_produto.preorder_config;
    v_capacity := (v_cfg->>'daily_capacity')::numeric;
    v_min_qty  := COALESCE((v_cfg->>'min_quantity')::numeric, 0);
    v_max_qty  := COALESCE((v_cfg->>'max_quantity')::numeric, 'Infinity'::numeric);
    v_min_lead := COALESCE((v_cfg->>'min_lead_days')::integer, 0);
    v_max_lead := COALESCE((v_cfg->>'max_lead_days')::integer, 365);

    IF v_qty < v_min_qty OR v_qty > v_max_qty THEN
      RAISE EXCEPTION 'PREORDER_INVALID_QUANTITY' USING ERRCODE = 'check_violation',
        DETAIL = format('Quantidade %s fora do intervalo [%s, %s].', v_qty, v_min_qty, v_max_qty);
    END IF;

    IF v_date < v_today + v_min_lead OR v_date > v_today + v_max_lead THEN
      RAISE EXCEPTION 'PREORDER_DATE_UNAVAILABLE' USING ERRCODE = 'check_violation',
        DETAIL = format('Data %s fora da janela de antecedência.', v_date);
    END IF;

    -- Dia da semana precisa estar aberto na grade da loja (0=domingo .. 6=sábado).
    v_dow := extract(dow FROM v_date)::int::text;
    IF v_horarios IS NOT NULL AND COALESCE(v_horarios->v_dow->>'aberto', 'false') <> 'true' THEN
      RAISE EXCEPTION 'PREORDER_DATE_UNAVAILABLE' USING ERRCODE = 'check_violation',
        DETAIL = format('Loja fechada em %s.', v_date);
    END IF;

    IF EXISTS (
      SELECT 1 FROM public.preorder_blocked_dates b
       WHERE b.blocked_date = v_date
         AND (b.product_id IS NULL OR b.product_id = v_product_id)
    ) THEN
      RAISE EXCEPTION 'PREORDER_DATE_UNAVAILABLE' USING ERRCODE = 'check_violation',
        DETAIL = format('Data %s bloqueada.', v_date);
    END IF;

    -- Serializa reservas concorrentes do MESMO (produto, data): o segundo
    -- checkout espera o primeiro commitar e então enxerga o consumo atualizado.
    -- Produtos/dias diferentes não se bloqueiam entre si.
    PERFORM pg_advisory_xact_lock(
      hashtextextended(v_product_id::text || ':' || v_date::text, 0));

    -- Consumo do dia: SUM(quantity) das encomendas cujo pedido não está cancelado.
    SELECT COALESCE(SUM(pr.quantity), 0) INTO v_used
      FROM public.preorders pr
      JOIN public.pedidos pe ON pe.id = pr.order_id
      JOIN public.kanban_coluna kc ON kc.chave = pe.status
     WHERE pr.product_id = v_product_id
       AND pr.delivery_date = v_date
       AND NOT kc.is_cancelled;

    IF v_capacity IS NULL OR v_used + v_qty > v_capacity THEN
      RAISE EXCEPTION 'PREORDER_CAPACITY_EXCEEDED' USING ERRCODE = 'check_violation',
        DETAIL = format('Capacidade do dia %s esgotada (%s/%s).', v_date, v_used, v_capacity);
    END IF;

    INSERT INTO public.preorders (order_id, product_id, delivery_date, quantity, unit, rules_snapshot)
    VALUES (
      p_order_id,
      v_product_id,
      v_date,
      v_qty,
      COALESCE(v_produto.unidade_medida::text, 'unidade'),
      v_cfg || jsonb_build_object('unit_price', v_produto.unit_price)
    );
  END LOOP;
END;
$$;

COMMENT ON FUNCTION public.reserve_preorders(uuid, jsonb) IS
  'Reserva atômica de encomendas para um pedido: valida produto/quantidade/janela/dia/capacidade e insere em preorders na mesma transação, serializada por advisory lock (produto, data). Falha lança PREORDER_* (check_violation) e reverte tudo.';

-- Somente o backend (service_role) reserva — o cliente nunca chama direto.
REVOKE EXECUTE ON FUNCTION public.reserve_preorders(uuid, jsonb) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.reserve_preorders(uuid, jsonb) TO service_role;

-- 6. catalog_products_page: expõe product_type e preorder_config ------------------------
-- O tipo de retorno muda → DROP + CREATE (CREATE OR REPLACE não altera RETURNS TABLE).

DROP FUNCTION IF EXISTS public.catalog_products_page(double precision, double precision, uuid, boolean, integer, uuid);

CREATE FUNCTION public.catalog_products_page(
  p_pivot       double precision,
  p_cursor_rank double precision,
  p_cursor_id   uuid,
  p_wrapped     boolean,
  p_limit       integer,
  p_categoria   uuid
)
RETURNS TABLE (
  id                    uuid,
  categoria_id          uuid,
  nome                  text,
  descricao             text,
  foto_url              text,
  imagens               text[],
  preco_venda           numeric,
  preco_promocional     numeric,
  unidade_medida        public.unidade_medida_enum,
  permite_fracionamento boolean,
  estoque_atual         numeric,
  disponivel            boolean,
  criado_em             timestamptz,
  tem_opcoes            boolean,
  product_type          text,
  preorder_config       jsonb,
  rank_aleatorio        double precision,
  wrapped               boolean
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_lim integer := greatest(1, least(coalesce(p_limit, 24), 100));
  v_got integer;
BEGIN
  IF NOT coalesce(p_wrapped, false) THEN
    RETURN QUERY
      SELECT p.id, p.categoria_id, p.nome, p.descricao, p.foto_url, p.imagens,
             p.preco_venda, p.preco_promocional, p.unidade_medida,
             p.permite_fracionamento, p.estoque_atual, p.disponivel, p.criado_em,
             EXISTS (SELECT 1 FROM public.produto_opcao_grupo g WHERE g.produto_id = p.id),
             p.product_type, p.preorder_config,
             p.rank_aleatorio, false
      FROM public.produtos p
      WHERE p.disponivel
        AND (p_categoria IS NULL OR p.categoria_id = p_categoria)
        AND p.rank_aleatorio >= p_pivot
        AND (p_cursor_rank IS NULL OR (p.rank_aleatorio, p.id) > (p_cursor_rank, p_cursor_id))
      ORDER BY p.rank_aleatorio, p.id
      LIMIT v_lim;

    GET DIAGNOSTICS v_got = ROW_COUNT;
    IF v_got >= v_lim THEN
      RETURN;
    END IF;

    RETURN QUERY
      SELECT p.id, p.categoria_id, p.nome, p.descricao, p.foto_url, p.imagens,
             p.preco_venda, p.preco_promocional, p.unidade_medida,
             p.permite_fracionamento, p.estoque_atual, p.disponivel, p.criado_em,
             EXISTS (SELECT 1 FROM public.produto_opcao_grupo g WHERE g.produto_id = p.id),
             p.product_type, p.preorder_config,
             p.rank_aleatorio, true
      FROM public.produtos p
      WHERE p.disponivel
        AND (p_categoria IS NULL OR p.categoria_id = p_categoria)
        AND p.rank_aleatorio < p_pivot
      ORDER BY p.rank_aleatorio, p.id
      LIMIT (v_lim - v_got);
  ELSE
    RETURN QUERY
      SELECT p.id, p.categoria_id, p.nome, p.descricao, p.foto_url, p.imagens,
             p.preco_venda, p.preco_promocional, p.unidade_medida,
             p.permite_fracionamento, p.estoque_atual, p.disponivel, p.criado_em,
             EXISTS (SELECT 1 FROM public.produto_opcao_grupo g WHERE g.produto_id = p.id),
             p.product_type, p.preorder_config,
             p.rank_aleatorio, true
      FROM public.produtos p
      WHERE p.disponivel
        AND (p_categoria IS NULL OR p.categoria_id = p_categoria)
        AND p.rank_aleatorio < p_pivot
        AND (p_cursor_rank IS NULL OR (p.rank_aleatorio, p.id) > (p_cursor_rank, p_cursor_id))
      ORDER BY p.rank_aleatorio, p.id
      LIMIT v_lim;
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.catalog_products_page(double precision, double precision, uuid, boolean, integer, uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.catalog_products_page(double precision, double precision, uuid, boolean, integer, uuid) TO anon, authenticated, service_role;

COMMIT;

-- =====================================================================================
-- DOWN (rollback manual):
--
-- BEGIN;
-- DROP FUNCTION IF EXISTS public.reserve_preorders(uuid, jsonb);
-- DROP TABLE IF EXISTS public.preorder_blocked_dates;
-- DROP TABLE IF EXISTS public.preorders;
-- ALTER TABLE public.produtos
--   DROP COLUMN IF EXISTS preorder_config,
--   DROP COLUMN IF EXISTS product_type;
-- -- Restaurar catalog_products_page SEM product_type/preorder_config:
-- -- reaplicar a definição da migration 061 (061_catalog_random_keyset.sql).
-- COMMIT;
-- =====================================================================================

-- =====================================================================================
-- VERIFICAÇÃO PÓS-APLICAÇÃO:
--   SELECT product_type, preorder_config FROM produtos LIMIT 1;
--   SELECT * FROM preorders LIMIT 1;
--   SELECT proname FROM pg_proc WHERE proname IN ('reserve_preorders');
-- =====================================================================================
