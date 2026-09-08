-- Migration 019: Adiciona config_pedidos à tabela loja
-- Permite configurar regras de arquivamento automático por status e horas.

ALTER TABLE loja
  ADD COLUMN IF NOT EXISTS config_pedidos JSONB
    DEFAULT '{"regras_arquivamento":[{"status":"entregue","horas":6},{"status":"cancelado","horas":6}],"horas_fallback":48}'::jsonb;

COMMENT ON COLUMN loja.config_pedidos IS
  'Regras de arquivamento configuráveis. Estrutura: { regras_arquivamento: [{status, horas}], horas_fallback: number }';
