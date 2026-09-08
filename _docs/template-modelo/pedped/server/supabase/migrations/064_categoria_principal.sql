-- Migration: Adicionar coluna principal à tabela categorias com trigger de garantia de unicidade

ALTER TABLE public.categorias 
ADD COLUMN IF NOT EXISTS principal boolean NOT NULL DEFAULT false;

-- Trigger para garantir que apenas uma categoria seja marcada como principal ao mesmo tempo
CREATE OR REPLACE FUNCTION public.garantir_unica_categoria_principal()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.principal = TRUE THEN
    UPDATE public.categorias
    SET principal = FALSE
    WHERE id <> NEW.id AND principal = TRUE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_garantir_unica_categoria_principal ON public.categorias;

CREATE TRIGGER trg_garantir_unica_categoria_principal
BEFORE INSERT OR UPDATE OF principal ON public.categorias
FOR EACH ROW
EXECUTE FUNCTION public.garantir_unica_categoria_principal();
