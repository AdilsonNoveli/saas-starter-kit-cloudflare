-- =====================================================================================
-- MIGRATION: Afinidade do cliente com o catálogo (canal_preferido)
-- Versão: 066
-- =====================================================================================
-- Sinal durável que o agente aprende e usa para oferecer o catálogo de forma
-- DINÂMICA (não engessada): 'catalogo' (compra pelo catálogo), 'chat' (prefere
-- pedir no chat), 'misto' (consulta no catálogo, pede no chat), NULL (desconhecido).
-- Gravado via PATCH /api/integration/v1/customers/context (tool 10 do agente),
-- validado por enum no endpoint. Idempotente.
-- =====================================================================================

BEGIN;

ALTER TABLE public.clientes
  ADD COLUMN IF NOT EXISTS canal_preferido text;

COMMIT;
