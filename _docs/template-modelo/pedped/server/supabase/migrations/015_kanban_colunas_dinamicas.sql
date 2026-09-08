-- =====================================================================================
-- MIGRATION: Kanban com colunas dinâmicas (status desacoplado do enum)
-- Versão: 015
-- Fase do Plano: 5.10 (Opção B — kanban totalmente dinâmico)
-- Descrição: O `status_pedido_enum` impedia adicionar/excluir colunas em runtime.
--   Como a aplicação é AGNÓSTICA à automação (apenas emite o status como texto nos
--   webhooks; toda automação é externa/n8n), o status deixa de ser enum e passa a
--   referenciar `kanban_coluna(chave)` via FK. `chave` é a identidade estável (slug)
--   usada por `pedidos.status` e pelos webhooks — imutável após criada; `label`/`cor`
--   são livres. `ON DELETE RESTRICT` impede excluir coluna que ainda tem pedidos.
--   As 7 colunas seed permanecem o padrão de qualquer nova instalação.
-- =====================================================================================

BEGIN;

-- 1) kanban_coluna: PK enum -> PK text (chave = identidade estável/slug)
ALTER TABLE public.kanban_coluna ALTER COLUMN status TYPE text USING status::text;
ALTER TABLE public.kanban_coluna RENAME COLUMN status TO chave;
COMMENT ON COLUMN public.kanban_coluna.chave IS
'Identidade estável da coluna (slug). Referenciada por pedidos.status e pelos webhooks; imutável após criada.';

-- 2) Dependentes do tipo/coluna que impedem o ALTER TYPE (recriados adiante)
DROP INDEX IF EXISTS public.idx_pedidos_em_entrega;
DROP VIEW IF EXISTS public.faturamento_diario;
DROP TRIGGER IF EXISTS trg_log_pedido_status ON public.pedidos;
DROP TRIGGER IF EXISTS trg_update_client_metrics ON public.pedidos;

-- 3) pedidos.status: enum -> text + FK para kanban_coluna(chave)
ALTER TABLE public.pedidos ALTER COLUMN status DROP DEFAULT;
ALTER TABLE public.pedidos ALTER COLUMN status TYPE text USING status::text;
ALTER TABLE public.pedidos ALTER COLUMN status SET DEFAULT 'pendente';
ALTER TABLE public.pedidos
  ADD CONSTRAINT pedidos_status_fkey
  FOREIGN KEY (status) REFERENCES public.kanban_coluna(chave)
  ON UPDATE CASCADE ON DELETE RESTRICT;

-- 4) histórico: enum -> text (auditoria; sem FK para sobreviver à exclusão de coluna)
ALTER TABLE public.pedido_status_historico ALTER COLUMN status_anterior TYPE text USING status_anterior::text;
ALTER TABLE public.pedido_status_historico ALTER COLUMN status_novo TYPE text USING status_novo::text;

-- 5) Recria triggers (mesmas definições; as funções comparam status como texto)
CREATE TRIGGER trg_log_pedido_status
  BEFORE UPDATE OF status ON public.pedidos
  FOR EACH ROW EXECUTE FUNCTION log_pedido_status_change();
CREATE TRIGGER trg_update_client_metrics
  AFTER UPDATE OF status ON public.pedidos
  FOR EACH ROW EXECUTE FUNCTION update_client_metrics();

-- 6) Recria índice parcial de entrega sem cast ao enum
CREATE INDEX idx_pedidos_em_entrega
ON public.pedidos (entregador_id)
WHERE entregador_id IS NOT NULL AND status = 'saiu_para_entrega';

-- 7) Recria a view de faturamento (predicado em texto)
CREATE VIEW public.faturamento_diario AS
SELECT
  (entregue_em AT TIME ZONE 'America/Sao_Paulo')::date AS dia,
  COUNT(*)::bigint                                       AS total_entregues,
  COALESCE(SUM(valor_total), 0)::numeric                 AS faturamento,
  CASE WHEN COUNT(*) > 0
       THEN COALESCE(SUM(valor_total), 0) / COUNT(*)
       ELSE 0 END::numeric                               AS ticket_medio
FROM public.pedidos
WHERE status = 'entregue' AND entregue_em IS NOT NULL
GROUP BY 1;

COMMENT ON VIEW public.faturamento_diario IS
'Agregado diário de pedidos entregues (timezone America/Sao_Paulo).';

-- 8) Remove o enum agora órfão
DROP TYPE IF EXISTS public.status_pedido_enum;

COMMIT;
