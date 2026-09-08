-- =====================================================================================
-- MIGRATION: Nota do atendente por pedido (pós-venda, staff-only)
-- Versão: 109
-- =====================================================================================
-- CONTEXTO: cliente pergunta "como está meu pedido?" depois da compra e o
-- agente só tem o status genérico do kanban (`pedidos.status`) para responder
-- — sem espaço pra um atendente registrar algo como "atraso por trânsito,
-- previsão 15h" que dê mais contexto à resposta.
--
-- `pedidos.observacoes` NÃO serve: é preenchido pelo CLIENTE no checkout
-- (observações agregadas do carrinho) e aparece no recibo do cliente
-- (OrderReceipt.vue, OrderThermalReceiptModal.vue) — reaproveitar vazaria nota
-- interna no recibo. `pedidos.nota_operacional` (migration 067) também não:
-- é gerada pelo SISTEMA na criação do pedido, não é editável pelo atendente.
--
-- `nota_atendimento` é a coluna nova: staff-only, editável a qualquer momento
-- pelo atendente (ícone no card do pedido), nunca impressa em recibo, e
-- surfada ao agente via `getCustomerContext.ts`/`getOrderDetail.ts`.
-- =====================================================================================

BEGIN;

ALTER TABLE public.pedidos
  ADD COLUMN IF NOT EXISTS nota_atendimento text;

COMMENT ON COLUMN public.pedidos.nota_atendimento IS
  'Nota interna do atendente sobre o andamento do pedido (ex.: "atraso por trânsito, previsão 15h"), editável pelo staff via ícone no card (/admin/orders). STAFF-ONLY: nunca aparece em recibo (OrderReceipt.vue/OrderThermalReceiptModal.vue/formatReceiptText) — só no JSON que o agente lê (ConsultarDetalhePedido, briefing do último pedido).';

COMMIT;

-- =====================================================================================
-- DOWN (rollback manual):
--   ALTER TABLE public.pedidos DROP COLUMN IF EXISTS nota_atendimento;
-- =====================================================================================
