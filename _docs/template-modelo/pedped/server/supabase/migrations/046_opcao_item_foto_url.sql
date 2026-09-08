-- =====================================================================================
-- MIGRATION: Foto no item de opção/variação
-- Versão: 046
-- Descrição: Adiciona `produto_opcao_item.foto_url` (foto da variação, ex: cor/modelo).
--            Nullable — a opção pode não ter foto.
--            Idempotente (IF NOT EXISTS).
-- =====================================================================================

BEGIN;

ALTER TABLE public.produto_opcao_item
  ADD COLUMN IF NOT EXISTS foto_url text;

COMMENT ON COLUMN public.produto_opcao_item.foto_url IS 'URL da foto da opção/variação (ex: cor ou modelo). NULL quando sem foto.';

COMMIT;
