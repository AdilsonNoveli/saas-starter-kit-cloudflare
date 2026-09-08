-- =====================================================================================
-- MIGRATION: Endereço de origem da loja
-- Versão: 005
-- Fase do Plano: 2.3
-- Descrição: Adiciona campos de endereço textual à `loja`. As coordenadas
--            `latitude_origem`/`longitude_origem` passam a ser derivadas via
--            geocoding do endereço (preenchidas no fluxo de configuração 5.9).
-- =====================================================================================

BEGIN;

ALTER TABLE public.loja
  ADD COLUMN IF NOT EXISTS endereco_rua text,
  ADD COLUMN IF NOT EXISTS endereco_numero text,
  ADD COLUMN IF NOT EXISTS endereco_complemento text,
  ADD COLUMN IF NOT EXISTS endereco_bairro text,
  ADD COLUMN IF NOT EXISTS endereco_cidade text,
  ADD COLUMN IF NOT EXISTS endereco_uf char(2),
  ADD COLUMN IF NOT EXISTS endereco_cep text;

COMMENT ON COLUMN public.loja.endereco_rua IS 'Logradouro da loja (origem para cálculo de raio/frete).';
COMMENT ON COLUMN public.loja.endereco_uf IS 'UF (sigla de 2 letras).';
COMMENT ON COLUMN public.loja.endereco_cep IS 'CEP (somente dígitos ou com máscara — saneado pela aplicação).';

COMMIT;
