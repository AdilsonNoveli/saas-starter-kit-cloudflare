-- =====================================================================================
-- MIGRATION: Adiciona ID curto de 5 dígitos amigável aos pedidos
-- Versão: 074
-- =====================================================================================
-- Cria uma sequência nativa e adiciona a coluna short_id auto-incremental
-- iniciando em 28431 para legibilidade por clientes e entregadores.
-- Idempotente.
-- =====================================================================================

BEGIN;

-- Cria sequência para o ID curto iniciando em 28431
CREATE SEQUENCE IF NOT EXISTS public.pedido_short_id_seq START WITH 28431;

-- Adiciona a coluna short_id associada ao próximo valor da sequência
ALTER TABLE public.pedidos 
  ADD COLUMN IF NOT EXISTS short_id integer DEFAULT nextval('public.pedido_short_id_seq');

-- Adiciona restrição de unicidade para a coluna short_id
ALTER TABLE public.pedidos 
  ADD CONSTRAINT pedidos_short_id_key UNIQUE (short_id);

COMMIT;
