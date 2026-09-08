-- =====================================================================================
-- MIGRATION: Opções/variações de produto (e congelamento no item de pedido)
-- Versão: 008
-- Fase do Plano: 2.6
-- Descrição:
--   - produto_opcao_grupo: grupo de opções (ex.: "Ingredientes", "Tamanho")
--   - produto_opcao_item:  item dentro do grupo (ex.: "Cebola", com preco_delta)
--   - itens_pedido_opcoes: seleções congeladas no pedido (nome + preco_delta)
--   - Atualiza o cálculo de subtotal de itens_pedido para somar os preco_delta.
-- =====================================================================================

BEGIN;

-- 1) Enum de tipo de grupo
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_opcao_grupo_enum') THEN
    CREATE TYPE tipo_opcao_grupo_enum AS ENUM ('single','multiple','toggle');
  END IF;
END $$;

-- 2) Tabelas de configuração de opções
CREATE TABLE IF NOT EXISTS public.produto_opcao_grupo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  produto_id uuid NOT NULL REFERENCES public.produtos(id) ON DELETE CASCADE,
  nome text NOT NULL,
  tipo tipo_opcao_grupo_enum NOT NULL DEFAULT 'single',
  obrigatorio boolean NOT NULL DEFAULT false,
  min_selecoes int NOT NULL DEFAULT 0,
  max_selecoes int NOT NULL DEFAULT 1,
  ordem int NOT NULL DEFAULT 0,
  criado_em timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_min_max CHECK (min_selecoes >= 0 AND max_selecoes >= min_selecoes)
);

COMMENT ON TABLE public.produto_opcao_grupo IS
'Grupo de opções de um produto (ex.: "Ingredientes" - tipo multiple/toggle; "Tamanho" - single).';

CREATE INDEX IF NOT EXISTS idx_produto_opcao_grupo_produto
ON public.produto_opcao_grupo (produto_id, ordem);

CREATE TABLE IF NOT EXISTS public.produto_opcao_item (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grupo_id uuid NOT NULL REFERENCES public.produto_opcao_grupo(id) ON DELETE CASCADE,
  nome text NOT NULL,
  preco_delta numeric(10,2) NOT NULL DEFAULT 0,
  selecionado_padrao boolean NOT NULL DEFAULT false,
  ativo boolean NOT NULL DEFAULT true,
  ordem int NOT NULL DEFAULT 0,
  criado_em timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.produto_opcao_item IS
'Item dentro de um grupo de opções (ex.: "Cebola"). preco_delta soma ao preço unitário.';

CREATE INDEX IF NOT EXISTS idx_produto_opcao_item_grupo
ON public.produto_opcao_item (grupo_id, ordem);

-- 3) Seleções congeladas no item de pedido
CREATE TABLE IF NOT EXISTS public.itens_pedido_opcoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_pedido_id uuid NOT NULL REFERENCES public.itens_pedido(id) ON DELETE CASCADE,
  opcao_item_id uuid REFERENCES public.produto_opcao_item(id) ON DELETE SET NULL,
  nome_congelado text NOT NULL,
  preco_delta_congelado numeric(10,2) NOT NULL DEFAULT 0,
  criado_em timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.itens_pedido_opcoes IS
'Opções selecionadas no item do pedido, com nome e preco_delta congelados.';

CREATE INDEX IF NOT EXISTS idx_itens_pedido_opcoes_item
ON public.itens_pedido_opcoes (item_pedido_id);

-- 4) Atualiza o cálculo de subtotal do item: soma de preco_delta_congelado entra no preço
-- Como subtotal de itens_pedido é GENERATED, criamos coluna gerada que considere extras
-- via VIEW; alternativa: substituir a coluna por trigger. Optamos por trigger para manter
-- a coluna materializada e os triggers de subtotal de pedido funcionando sem alteração.

-- 4.1) Remove a coluna gerada e recria como trigger-managed
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='itens_pedido' AND column_name='subtotal'
      AND is_generated = 'ALWAYS'
  ) THEN
    ALTER TABLE public.itens_pedido DROP COLUMN subtotal;
    ALTER TABLE public.itens_pedido ADD COLUMN subtotal numeric;
  END IF;
END $$;

-- 4.2) Trigger que recalcula subtotal do item considerando opções
CREATE OR REPLACE FUNCTION public.recalculate_item_subtotal()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_extras numeric := 0;
  v_item RECORD;
BEGIN
  IF TG_TABLE_NAME = 'itens_pedido_opcoes' THEN
    SELECT COALESCE(SUM(preco_delta_congelado), 0) INTO v_extras
    FROM public.itens_pedido_opcoes
    WHERE item_pedido_id = COALESCE(NEW.item_pedido_id, OLD.item_pedido_id);

    SELECT preco_unitario_congelado, quantidade INTO v_item
    FROM public.itens_pedido
    WHERE id = COALESCE(NEW.item_pedido_id, OLD.item_pedido_id);

    UPDATE public.itens_pedido
    SET subtotal = (COALESCE(v_item.preco_unitario_congelado, 0) + v_extras) * COALESCE(v_item.quantidade, 0)
    WHERE id = COALESCE(NEW.item_pedido_id, OLD.item_pedido_id);

    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Em itens_pedido (INSERT/UPDATE)
  SELECT COALESCE(SUM(preco_delta_congelado), 0) INTO v_extras
  FROM public.itens_pedido_opcoes
  WHERE item_pedido_id = NEW.id;

  NEW.subtotal := (COALESCE(NEW.preco_unitario_congelado, 0) + v_extras) * COALESCE(NEW.quantidade, 0);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_itens_pedido_subtotal ON public.itens_pedido;
CREATE TRIGGER trg_itens_pedido_subtotal
BEFORE INSERT OR UPDATE OF preco_unitario_congelado, quantidade ON public.itens_pedido
FOR EACH ROW EXECUTE FUNCTION public.recalculate_item_subtotal();

DROP TRIGGER IF EXISTS trg_itens_pedido_opcoes_subtotal ON public.itens_pedido_opcoes;
CREATE TRIGGER trg_itens_pedido_opcoes_subtotal
AFTER INSERT OR UPDATE OR DELETE ON public.itens_pedido_opcoes
FOR EACH ROW EXECUTE FUNCTION public.recalculate_item_subtotal();

-- 4.3) Backfill: recalcula subtotal de itens existentes
UPDATE public.itens_pedido
   SET subtotal = COALESCE(preco_unitario_congelado, 0) * COALESCE(quantidade, 0)
 WHERE subtotal IS NULL;

-- 5) RLS
ALTER TABLE public.produto_opcao_grupo  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produto_opcao_item   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itens_pedido_opcoes  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read produto_opcao_grupo" ON public.produto_opcao_grupo;
CREATE POLICY "Public read produto_opcao_grupo" ON public.produto_opcao_grupo
FOR SELECT
USING (
  EXISTS (SELECT 1 FROM public.produtos p WHERE p.id = produto_opcao_grupo.produto_id AND p.disponivel = true)
);

DROP POLICY IF EXISTS "Manage produto_opcao_grupo (gerente+)" ON public.produto_opcao_grupo;
CREATE POLICY "Manage produto_opcao_grupo (gerente+)" ON public.produto_opcao_grupo
FOR ALL
USING (public.has_role(ARRAY['gerente','administrador','proprietario']::role_usuario_enum[]))
WITH CHECK (public.has_role(ARRAY['gerente','administrador','proprietario']::role_usuario_enum[]));

DROP POLICY IF EXISTS "Public read produto_opcao_item" ON public.produto_opcao_item;
CREATE POLICY "Public read produto_opcao_item" ON public.produto_opcao_item
FOR SELECT
USING (
  ativo = true AND EXISTS (
    SELECT 1
    FROM public.produto_opcao_grupo g
    JOIN public.produtos p ON p.id = g.produto_id
    WHERE g.id = produto_opcao_item.grupo_id AND p.disponivel = true
  )
);

DROP POLICY IF EXISTS "Manage produto_opcao_item (gerente+)" ON public.produto_opcao_item;
CREATE POLICY "Manage produto_opcao_item (gerente+)" ON public.produto_opcao_item
FOR ALL
USING (public.has_role(ARRAY['gerente','administrador','proprietario']::role_usuario_enum[]))
WITH CHECK (public.has_role(ARRAY['gerente','administrador','proprietario']::role_usuario_enum[]));

DROP POLICY IF EXISTS "Staff manage itens_pedido_opcoes" ON public.itens_pedido_opcoes;
CREATE POLICY "Staff manage itens_pedido_opcoes" ON public.itens_pedido_opcoes
FOR ALL USING (public.is_staff()) WITH CHECK (public.is_staff());

COMMIT;
