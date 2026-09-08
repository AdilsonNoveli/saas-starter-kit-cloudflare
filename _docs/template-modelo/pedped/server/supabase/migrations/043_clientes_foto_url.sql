-- =====================================================================================
-- MIGRATION: Foto do cliente
-- Versão: 043
-- Descrição: Adiciona `clientes.foto_url` (avatar do cliente). Nullable — o cliente
--            pode não ter foto (exibe iniciais como fallback). Imagem enviada via
--            o mesmo fluxo S3 (/api/admin/upload → bucket attachments).
--            Idempotente (IF NOT EXISTS).
-- =====================================================================================

BEGIN;

ALTER TABLE public.clientes
  ADD COLUMN IF NOT EXISTS foto_url text;

COMMENT ON COLUMN public.clientes.foto_url IS 'URL da foto/avatar do cliente. NULL quando sem foto (UI exibe iniciais).';

COMMIT;
