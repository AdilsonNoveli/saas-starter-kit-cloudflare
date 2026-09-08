-- =====================================================================================
-- MIGRATION: Fulfillment por-item (EPIC 4 Feature 4.1 — PRD-REFATORACAO)
-- Versão: 085
-- =====================================================================================
-- CONTEXTO:
--   Hoje modalidade/endereço vivem só no nível do PEDIDO (pedidos.tipo_entrega/
--   endereco_id), herdados de sessoes.delivery_mode/address_id (EPIC 1). Isso
--   impede um pedido misto onde um item diverge (ex.: pizza-retirada + bolo
--   por encomenda-entrega no mesmo carrinho).
--
--   Resolução de nível: o item só grava a própria modalidade/endereço quando
--   DIVERGE do padrão do carrinho/pedido — o caso comum (tudo igual) continua
--   promovido ao nível do pedido, sem colunas extras preenchidas. Simples no
--   comum, poderoso no misto.
--
--   `cart_items` ganha o override ANTES do checkout (coletado incrementalmente
--   pelo agente); `itens_pedido` ganha o mesmo par para PRESERVAR o override no
--   pedido final (a sessão/carrinho é limpa no checkout).
--
-- IDEMPOTÊNCIA: ADD COLUMN IF NOT EXISTS; CHECKs via DROP/ADD IF EXISTS.
-- =====================================================================================

BEGIN;

ALTER TABLE public.cart_items
  ADD COLUMN IF NOT EXISTS delivery_mode text NULL,
  ADD COLUMN IF NOT EXISTS address_id    uuid NULL;

ALTER TABLE public.cart_items DROP CONSTRAINT IF EXISTS cart_items_delivery_mode_check;
ALTER TABLE public.cart_items ADD CONSTRAINT cart_items_delivery_mode_check
  CHECK (delivery_mode IS NULL OR delivery_mode IN ('entrega', 'retirada'));

ALTER TABLE public.cart_items
  ADD CONSTRAINT cart_items_address_id_fkey FOREIGN KEY (address_id)
  REFERENCES public.enderecos_cliente(id);

COMMENT ON COLUMN public.cart_items.delivery_mode IS
  'Override de modalidade SÓ deste item (Feature 4.1). NULL = herda sessoes.delivery_mode.';
COMMENT ON COLUMN public.cart_items.address_id IS
  'Override de endereço SÓ deste item (Feature 4.1). NULL = herda sessoes.address_id.';

ALTER TABLE public.itens_pedido
  ADD COLUMN IF NOT EXISTS delivery_mode text NULL,
  ADD COLUMN IF NOT EXISTS endereco_id   uuid NULL REFERENCES public.enderecos_cliente(id);

ALTER TABLE public.itens_pedido DROP CONSTRAINT IF EXISTS itens_pedido_delivery_mode_check;
ALTER TABLE public.itens_pedido ADD CONSTRAINT itens_pedido_delivery_mode_check
  CHECK (delivery_mode IS NULL OR delivery_mode IN ('entrega', 'retirada'));

COMMENT ON COLUMN public.itens_pedido.delivery_mode IS
  'Override de modalidade só deste item, preservado do carrinho (Feature 4.1). NULL = herda pedidos.tipo_entrega.';
COMMENT ON COLUMN public.itens_pedido.endereco_id IS
  'Override de endereço só deste item, preservado do carrinho (Feature 4.1). NULL = herda pedidos.endereco_id.';

COMMIT;

-- =====================================================================================
-- DOWN (rollback manual):
--
-- BEGIN;
-- ALTER TABLE public.itens_pedido DROP COLUMN IF EXISTS endereco_id;
-- ALTER TABLE public.itens_pedido DROP COLUMN IF EXISTS delivery_mode;
-- ALTER TABLE public.cart_items DROP CONSTRAINT IF EXISTS cart_items_address_id_fkey;
-- ALTER TABLE public.cart_items DROP CONSTRAINT IF EXISTS cart_items_delivery_mode_check;
-- ALTER TABLE public.cart_items DROP COLUMN IF EXISTS address_id;
-- ALTER TABLE public.cart_items DROP COLUMN IF EXISTS delivery_mode;
-- COMMIT;
-- =====================================================================================
