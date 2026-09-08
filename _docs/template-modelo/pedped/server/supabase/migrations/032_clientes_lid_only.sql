-- ============================================================
-- Migration 032 — Cliente identificável por @lid OU telefone
-- A nova API do WhatsApp pode entregar apenas o @lid (privacidade).
-- O fluxo agentivo cria o cliente com lid-only e o agente pede o
-- telefone na conversa (backfill posterior via customers/context).
-- Integridade: pelo menos UM identificador é obrigatório.
-- ============================================================

ALTER TABLE public.clientes ALTER COLUMN telefone_whatsapp DROP NOT NULL;

-- Unicidade do telefone continua garantida pelo índice único existente
-- (btree único permite múltiplos NULLs — comportamento desejado).

ALTER TABLE public.clientes DROP CONSTRAINT IF EXISTS chk_clientes_identificador;
ALTER TABLE public.clientes ADD CONSTRAINT chk_clientes_identificador
  CHECK (telefone_whatsapp IS NOT NULL OR whatsapp_lid IS NOT NULL);
