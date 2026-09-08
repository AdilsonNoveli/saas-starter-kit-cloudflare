-- =====================================================================================
-- MIGRATION: Nota operacional no pedido (instrução no card do kanban)
-- Versão: 067
-- =====================================================================================
-- Instrução curta, visível ao staff no card do kanban, gerada no fechamento quando
-- o pedido nasce PENDENTE por algum motivo — ex.: "Confirmar recebimento do PIX
-- antes de mover para Confirmado" ou "Verificar endereço com o cliente".
-- Diferente de `observacoes` (nota do CLIENTE, exibida na nota térmica).
-- Idempotente.
-- =====================================================================================

BEGIN;

ALTER TABLE public.pedidos
  ADD COLUMN IF NOT EXISTS nota_operacional text;

COMMIT;
