-- =====================================================================================
-- MIGRATION: Adicionar Sistema de Arquivamento de Pedidos
-- Versão: 001
-- Data: 2024
-- Descrição: Adiciona campos para soft delete/arquivamento de pedidos antigos
--            Implementa separação entre Kanban (operacional) e Histórico (arquivado)
-- =====================================================================================

BEGIN;

-- 1. Adicionar colunas de arquivamento
ALTER TABLE pedidos 
ADD COLUMN IF NOT EXISTS arquivado BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS arquivado_em TIMESTAMPTZ;

-- 2. Criar índice parcial para Kanban (pedidos ativos)
-- Este índice cobre apenas pedidos não-arquivados, mantendo tamanho reduzido
CREATE INDEX IF NOT EXISTS idx_pedidos_kanban 
ON pedidos(status, criado_em DESC) 
WHERE arquivado = FALSE;

-- 3. Criar índice para Histórico (pedidos arquivados)
CREATE INDEX IF NOT EXISTS idx_pedidos_historico 
ON pedidos(arquivado_em DESC, status) 
WHERE arquivado = TRUE;

-- Nota: índice "últimas 24h" foi removido propositalmente.
-- Predicado de índice no Postgres exige expressão IMMUTABLE; NOW() é STABLE
-- e provoca "functions in index predicate must be marked IMMUTABLE".
-- O recorte temporal já é coberto pelo idx_pedidos_kanban (arquivado=false)
-- combinado com a janela de 7 dias aplicada pelo job de arquivamento.

-- 4. Adicionar comentários para documentação
COMMENT ON COLUMN pedidos.arquivado IS 'Flag para arquivamento soft delete (não remove dados)';
COMMENT ON COLUMN pedidos.arquivado_em IS 'Timestamp de quando o pedido foi arquivado';
COMMENT ON INDEX idx_pedidos_kanban IS 'Índice parcial para queries do Kanban (apenas pedidos ativos)';
COMMENT ON INDEX idx_pedidos_historico IS 'Índice para queries da página de Histórico';

COMMIT;

-- =====================================================================================
-- VERIFICAÇÃO PÓS-MIGRATION
-- =====================================================================================
-- Execute estas queries para validar a migration:

-- 1. Verificar colunas adicionadas
SELECT 
  column_name, 
  data_type, 
  column_default,
  is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public'
  AND table_name = 'pedidos' 
  AND column_name IN ('arquivado', 'arquivado_em')
ORDER BY column_name;

-- 2. Verificar índices criados
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes 
WHERE schemaname = 'public'
  AND tablename = 'pedidos' 
  AND indexname LIKE 'idx_pedidos_%'
ORDER BY indexname;

-- 3. Contar pedidos por status de arquivamento
SELECT 
  arquivado,
  COUNT(*) as total_pedidos,
  COUNT(*) FILTER (WHERE criado_em > NOW() - INTERVAL '24 hours') as ultimas_24h,
  COUNT(*) FILTER (WHERE status IN ('entregue', 'cancelado')) as finalizados
FROM pedidos
GROUP BY arquivado;

-- 4. Testar performance do índice parcial
EXPLAIN ANALYZE
SELECT id, status, criado_em, valor_total
FROM pedidos
WHERE arquivado = FALSE
  AND criado_em > NOW() - INTERVAL '24 hours'
ORDER BY criado_em DESC
LIMIT 100;

-- =====================================================================================
-- SUCESSO
-- =====================================================================================
-- ✅ Migration concluída com sucesso!
-- 
-- PRÓXIMOS PASSOS:
-- 1. Verificar os resultados das queries de validação acima
-- 2. Executar ANALYZE pedidos; para atualizar estatísticas
-- 3. Implementar Edge Function de arquivamento automático
-- 4. Configurar Supabase Cron Job
-- 5. Atualizar queries do frontend (Kanban e Histórico)
-- =====================================================================================
