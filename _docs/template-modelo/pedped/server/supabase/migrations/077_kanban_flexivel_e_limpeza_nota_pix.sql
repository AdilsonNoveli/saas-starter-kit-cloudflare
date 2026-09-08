-- =====================================================================================
-- MIGRATION: Kanban flexível — apenas Pendente/Confirmado como colunas de sistema
--            + remoção das notas operacionais automáticas de PIX
-- Versão: 077
-- =====================================================================================
-- CONTEXTO
-- 1) A automação de pedidos é 100% flag-driven (migration 060): despacho de
--    entregador, "saiu para entrega", baixa de entrega, cancelamento e
--    faturamento resolvem a coluna pela FLAG (is_delivery_dispatch,
--    is_out_for_delivery, is_delivered, is_cancelled, is_revenue_trigger),
--    nunca pela chave. As únicas chaves referenciadas em código são
--    'pendente' e 'confirmado' (status inicial na criação de pedidos e guarda
--    de edição) — somente elas precisam permanecer is_sistema.
--    As demais 5 canônicas ('em_preparo','preparado','saiu_para_entrega',
--    'entregue','cancelado') ficam editáveis/removíveis para adaptar o quadro
--    a outros processos de venda (ex.: loja de roupas sem "Em Preparo").
--    Salvaguardas que permanecem:
--      • edição na UI é opt-in (loja.config_pedidos.permitir_editar_kanban);
--      • FK pedidos.status → kanban_coluna é ON DELETE RESTRICT (coluna com
--        pedidos não pode ser excluída);
--      • as flags seguem nas colunas — nada muda na automação (zero regressão).
-- 2) A nota operacional automática de PIX ("Confirmar recebimento do PIX antes
--    de mover" / "Recebimento do PIX confirmado") foi removida do produto
--    (criação e troca de status não gravam mais). Aqui limpamos o texto das
--    notas já gravadas preservando qualquer outro conteúdo (ex.: aviso de
--    endereço não validado).
-- =====================================================================================

BEGIN;

-- 1) Desprotege as 5 colunas de etapa. O trigger guard bloqueia is_sistema=false,
--    então é desabilitado apenas durante este UPDATE (dentro da transação).
ALTER TABLE public.kanban_coluna DISABLE TRIGGER trg_guard_system_kanban_coluna_upd;

UPDATE public.kanban_coluna
   SET is_sistema = false
 WHERE is_sistema = true
   AND chave NOT IN ('pendente', 'confirmado');

ALTER TABLE public.kanban_coluna ENABLE TRIGGER trg_guard_system_kanban_coluna_upd;

-- 2) Normaliza a ordem: colunas de sistema sempre à frente (1..k), etapas na
--    sequência (k+1..n), preservando a ordem relativa atual de cada grupo.
WITH ranked AS (
  SELECT chave,
         ROW_NUMBER() OVER (ORDER BY (NOT is_sistema), ordem, chave) AS nova_ordem
    FROM public.kanban_coluna
)
UPDATE public.kanban_coluna kc
   SET ordem = r.nova_ordem
  FROM ranked r
 WHERE kc.chave = r.chave
   AND kc.ordem IS DISTINCT FROM r.nova_ordem;

-- 3) Remove as frases automáticas de PIX das notas existentes, preservando o
--    restante do texto. Notas que fiquem vazias viram NULL.
UPDATE public.pedidos
   SET nota_operacional = NULLIF(
         btrim(
           regexp_replace(
             nota_operacional,
             'Confirm(e|ar) o? ?recebimento do PIX( antes de mover)?\.?|Recebimento do PIX confirmado\.?',
             '',
             'gi'
           )
         ),
         ''
       )
 WHERE nota_operacional ~* '(recebimento do PIX|PIX confirmado)';

COMMIT;
