-- =====================================================================================
-- MIGRATION: Remover webhook_secret da tabela loja (mover para .env)
-- Versão: 002
-- Data: 2024
-- Descrição: Por segurança, o webhook_secret agora vive apenas no .env do servidor
--            O webhook_url continua configurável via admin
-- =====================================================================================

BEGIN;

-- Remove a coluna webhook_secret (dados sensíveis não devem estar no banco)
ALTER TABLE loja 
DROP COLUMN IF EXISTS webhook_secret;

-- Adiciona comentário explicativo
COMMENT ON COLUMN loja.webhook_url IS 'Endpoint do webhook (N8N/Zapier/Make). Secret está no .env por segurança.';

COMMIT;

-- =====================================================================================
-- NOTA IMPORTANTE
-- =====================================================================================
-- Configure a variável WEBHOOK_SECRET no arquivo .env do servidor:
-- WEBHOOK_SECRET="seu-token-secreto-aqui"
-- 
-- O webhook_url continua sendo configurado via /admin/configuracoes
-- =====================================================================================
