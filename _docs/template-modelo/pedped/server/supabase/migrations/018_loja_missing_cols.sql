-- =====================================================================================
-- MIGRATION: Colunas ausentes em loja (backfill para deploys anteriores ao init atual)
-- Versão: 018
-- Descrição: Adiciona colunas que estão no supabase-init.sql mas não foram aplicadas
--            ao banco por terem sido acrescentadas ao schema após a criação inicial.
--            Todas as operações usam IF NOT EXISTS — idempotente e segura.
-- =====================================================================================

BEGIN;

-- status_override_data: controla override manual do status_operacao
ALTER TABLE public.loja
  ADD COLUMN IF NOT EXISTS status_override_data date DEFAULT NULL;

-- endereco_*: endereço da loja para cálculo de raio/frete (Fase 2.3 / migração 005)
ALTER TABLE public.loja
  ADD COLUMN IF NOT EXISTS endereco_rua text,
  ADD COLUMN IF NOT EXISTS endereco_numero text,
  ADD COLUMN IF NOT EXISTS endereco_complemento text,
  ADD COLUMN IF NOT EXISTS endereco_bairro text,
  ADD COLUMN IF NOT EXISTS endereco_cidade text,
  ADD COLUMN IF NOT EXISTS endereco_uf char(2),
  ADD COLUMN IF NOT EXISTS endereco_cep text;

COMMENT ON COLUMN public.loja.status_override_data IS 'Data do override manual de status_operacao. NULL quando em modo automático.';
COMMENT ON COLUMN public.loja.endereco_rua IS 'Logradouro da loja (origem para cálculo de raio/frete).';
COMMENT ON COLUMN public.loja.endereco_uf IS 'UF (sigla de 2 letras).';
COMMENT ON COLUMN public.loja.endereco_cep IS 'CEP (somente dígitos ou com máscara — saneado pela aplicação).';

COMMIT;
