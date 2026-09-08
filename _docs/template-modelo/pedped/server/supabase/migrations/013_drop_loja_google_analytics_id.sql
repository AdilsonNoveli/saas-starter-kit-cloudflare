-- =====================================================================================
-- MIGRATION: Remoção do campo google_analytics_id da tabela loja
-- Versão: 013
-- Fase do Plano: 3.5
-- Descrição:
--   - Phase 3.5 remove integração com Google Analytics. A coluna
--     `loja.google_analytics_id` deixa de fazer sentido (a observabilidade
--     interna 2.9/3.4 substitui o GA).
--   - Idempotente (`IF EXISTS`).
-- =====================================================================================

BEGIN;

ALTER TABLE public.loja DROP COLUMN IF EXISTS google_analytics_id;

COMMIT;
