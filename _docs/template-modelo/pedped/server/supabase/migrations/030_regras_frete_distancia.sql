-- ============================================================
-- Migration 030 — Regras de Frete por Distância
-- Cria: tabela regras_frete_distancia, RPC calcular_frete_por_distancia,
--       trigger calculate_pedido_totals (valor_total = subtotal + frete - desconto)
-- ============================================================

-- ─── Tabela ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.regras_frete_distancia (
  id               uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  distancia_min_km numeric NOT NULL CHECK (distancia_min_km >= 0),
  distancia_max_km numeric NOT NULL,
  valor_frete      numeric NOT NULL CHECK (valor_frete >= 0),
  ativo            boolean NOT NULL DEFAULT true,
  ordem            int     NOT NULL,
  criado_em        timestamptz NOT NULL DEFAULT now(),
  atualizado_em    timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT chk_distancia_ordenada CHECK (distancia_max_km > distancia_min_km),
  CONSTRAINT unique_ordem UNIQUE (ordem)
);

CREATE INDEX IF NOT EXISTS idx_regras_frete_ativas
  ON public.regras_frete_distancia (ordem)
  WHERE ativo = true;

-- updated_at automático (idempotente via DROP IF EXISTS)
DROP TRIGGER IF EXISTS trg_regras_frete_updated_at ON public.regras_frete_distancia;
CREATE TRIGGER trg_regras_frete_updated_at
  BEFORE UPDATE ON public.regras_frete_distancia
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ─── RLS ─────────────────────────────────────────────────────────────────────
ALTER TABLE public.regras_frete_distancia ENABLE ROW LEVEL SECURITY;

-- Leitura pública: /api/calcular-frete usa serverSupabaseClient (anon role do catálogo)
DROP POLICY IF EXISTS "anon_read_regras_frete" ON public.regras_frete_distancia;
CREATE POLICY "anon_read_regras_frete"
  ON public.regras_frete_distancia FOR SELECT
  TO anon, authenticated USING (true);

-- Escrita para admins autenticados: admin/settings usa useSupabaseClient() (JWT do usuário).
-- Proteção real vem do middleware 3.admin-auth.ts — RLS garante que só role authenticated
-- pode escrever; o middleware garante que só admins chegam nessa página.
DROP POLICY IF EXISTS "authenticated_write_regras_frete" ON public.regras_frete_distancia;
CREATE POLICY "authenticated_write_regras_frete"
  ON public.regras_frete_distancia FOR ALL
  TO authenticated USING (true) WITH CHECK (true);

-- ─── RPC: calcular_frete_por_distancia ───────────────────────────────────────
-- Retorna NULL se nenhuma regra ativa englobar a distância (fallback fica no app).
CREATE OR REPLACE FUNCTION public.calcular_frete_por_distancia(p_distancia_km numeric)
RETURNS numeric
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_valor numeric;
BEGIN
  SELECT valor_frete INTO v_valor
  FROM public.regras_frete_distancia
  WHERE ativo = true
    AND p_distancia_km >= distancia_min_km
    AND p_distancia_km <  distancia_max_km
  ORDER BY ordem ASC
  LIMIT 1;

  RETURN v_valor;  -- NULL = sem regra; caller usa loja.taxa_entrega_padrao
END;
$$;

GRANT EXECUTE ON FUNCTION public.calcular_frete_por_distancia(numeric) TO anon, authenticated, service_role;

-- ─── Trigger: calculate_pedido_totals ────────────────────────────────────────
-- Mantém valor_total = valor_subtotal + valor_entrega - desconto_aplicado
-- Disparado BEFORE INSERT OR UPDATE nos campos relevantes.
CREATE OR REPLACE FUNCTION public.calculate_pedido_totals()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_catalog
AS $$
BEGIN
  NEW.valor_total :=
    COALESCE(NEW.valor_subtotal, 0)
    + COALESCE(NEW.valor_entrega, 0)
    - COALESCE(NEW.desconto_aplicado, 0);
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_calculate_pedido_totals'
      AND tgrelid = 'public.pedidos'::regclass
  ) THEN
    CREATE TRIGGER trg_calculate_pedido_totals
      BEFORE INSERT OR UPDATE OF valor_subtotal, valor_entrega, desconto_aplicado
      ON public.pedidos
      FOR EACH ROW EXECUTE FUNCTION public.calculate_pedido_totals();
  END IF;
END;
$$;
