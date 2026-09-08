-- =====================================================================================
-- MIGRATION: Estado de checkout server-side (EPIC 1 — PRD-REFATORACAO)
-- Versão: 082
-- =====================================================================================
-- CONTEXTO:
--   Hoje o LLM carrega tipo_entrega/forma_pagamento/endereço até o momento do
--   fechamento (`FinalizarPedidoCarrinho`), tornando a finalização um
--   transportador de dados de negócio em vez de um commit puro. Esta migration
--   move esse estado para o servidor:
--
--     • `sessoes` ganha delivery_mode/payment_method/address_id — o "portador"
--       do estado de pedido (não existe tabela `cart` separada; `cart_items`
--       já referencia `sessoes`).
--     • `cart_items` ganha target_date/observacao — atributos por-item usados
--       por produtos de encomenda (EPIC 3 os habilita no carrinho unificado).
--
--   Colunas aditivas e nullable: nenhum dado existente é afetado.
--
-- IDEMPOTÊNCIA: ADD COLUMN IF NOT EXISTS; constraints via DROP/ADD IF EXISTS.
-- =====================================================================================

BEGIN;

ALTER TABLE public.sessoes
  ADD COLUMN IF NOT EXISTS delivery_mode  text NULL,
  ADD COLUMN IF NOT EXISTS payment_method text NULL,
  ADD COLUMN IF NOT EXISTS address_id     uuid NULL REFERENCES public.enderecos_cliente(id);

ALTER TABLE public.sessoes DROP CONSTRAINT IF EXISTS sessoes_delivery_mode_check;
ALTER TABLE public.sessoes ADD CONSTRAINT sessoes_delivery_mode_check
  CHECK (delivery_mode IS NULL OR delivery_mode IN ('entrega', 'retirada'));

ALTER TABLE public.sessoes DROP CONSTRAINT IF EXISTS sessoes_payment_method_check;
ALTER TABLE public.sessoes ADD CONSTRAINT sessoes_payment_method_check
  CHECK (payment_method IS NULL OR payment_method IN ('pix', 'dinheiro', 'cartao'));

COMMENT ON COLUMN public.sessoes.delivery_mode IS
  'Checkout server-side (EPIC 1): modalidade coletada via PATCH /cart. NULL = ainda não informada.';
COMMENT ON COLUMN public.sessoes.payment_method IS
  'Checkout server-side (EPIC 1): forma de pagamento coletada via PATCH /cart. NULL = ainda não informada.';
COMMENT ON COLUMN public.sessoes.address_id IS
  'Checkout server-side (EPIC 1): endereço salvo escolhido via ConsultarEnderecoEntrega. NULL = ainda não informado ou entrega usa endereço avulso.';

ALTER TABLE public.cart_items
  ADD COLUMN IF NOT EXISTS target_date date NULL,
  ADD COLUMN IF NOT EXISTS observacao  text NULL;

COMMENT ON COLUMN public.cart_items.target_date IS
  'Data de entrega/retirada do item (produtos de encomenda). NULL para itens de venda imediata.';
COMMENT ON COLUMN public.cart_items.observacao IS
  'Observação livre do cliente para este item específico (ex.: mensagem no bolo).';

COMMIT;

-- =====================================================================================
-- DOWN (rollback manual):
--
-- BEGIN;
-- ALTER TABLE public.cart_items DROP COLUMN IF EXISTS observacao;
-- ALTER TABLE public.cart_items DROP COLUMN IF EXISTS target_date;
-- ALTER TABLE public.sessoes DROP CONSTRAINT IF EXISTS sessoes_payment_method_check;
-- ALTER TABLE public.sessoes DROP CONSTRAINT IF EXISTS sessoes_delivery_mode_check;
-- ALTER TABLE public.sessoes DROP COLUMN IF EXISTS address_id;
-- ALTER TABLE public.sessoes DROP COLUMN IF EXISTS payment_method;
-- ALTER TABLE public.sessoes DROP COLUMN IF EXISTS delivery_mode;
-- COMMIT;
-- =====================================================================================
