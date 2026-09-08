-- =====================================================================================
-- MIGRATION: Estoque — 'producao_diaria' e encomenda são mutuamente exclusivos
-- Versão: 112
-- =====================================================================================
-- CONTEXTO: a política de estoque `controle_estoque='producao_diaria'`
-- (migration 111) foi desenhada especificamente para produto de PRONTA
-- ENTREGA sem agendamento — o próprio racional da migration 111 explica que
-- ela existe justamente para NÃO forçar esse tipo de produto a virar
-- `product_type='preorder'`. Encomenda já tem seu PRÓPRIO mecanismo de
-- capacidade diária (`preorder_config.daily_capacity`, migration 078,
-- aplicado via `reserve_preorders` por DATA agendada).
--
-- Sem esta constraint, um produto podia acumular as DUAS configurações de
-- "capacidade diária" ao mesmo tempo — redundante na UI admin (dois campos
-- "Capacidade limite diária" pro mesmo produto) e ERRADO no cálculo: a SUM de
-- `estoque_movimentacoes` por `criado_em::date = hoje` (usada por
-- `consumir_estoque_pedido` pra 'producao_diaria') contaria uma encomenda
-- fechada HOJE mas agendada pra daqui a 20 dias como "produção de hoje" —
-- consumindo a capacidade do dia errado. O agente também ficaria com DUAS
-- fontes de limite pro mesmo produto, quando o objetivo do sistema inteiro
-- (ver QUANTITY_LIMITS_NOTE, systemPrompt.ts) é nunca ambiguidade.
--
-- Resolução: mutuamente exclusivos, sempre. Produto de encomenda continua
-- podendo usar `controle_estoque='contagem'` (teto físico de matéria-prima,
-- INDEPENDENTE da data — caso legítimo e diferente, não afetado aqui).
-- =====================================================================================

BEGIN;

-- Defensivo: zera controle_estoque de qualquer produto que já esteja no
-- estado inválido antes de travar a constraint (não deveria existir nenhum,
-- já que 'producao_diaria' é recente, mas a migration precisa ser segura
-- pra rodar em qualquer ordem/ambiente).
UPDATE public.produtos
   SET controle_estoque = 'nenhum',
       producao_diaria_limite = NULL
 WHERE product_type = 'preorder'
   AND controle_estoque = 'producao_diaria';

ALTER TABLE public.produtos
  ADD CONSTRAINT produtos_producao_diaria_exclusivo_encomenda
    CHECK (NOT (product_type = 'preorder' AND controle_estoque = 'producao_diaria'));

COMMENT ON CONSTRAINT produtos_producao_diaria_exclusivo_encomenda ON public.produtos IS
  'Encomenda já tem capacidade diária própria (preorder_config.daily_capacity, por data agendada). controle_estoque=''producao_diaria'' é o equivalente pra pronta entrega (sem agendamento) — as duas nunca coexistem no mesmo produto.';

COMMIT;

-- =====================================================================================
-- DOWN (rollback manual):
--   ALTER TABLE public.produtos DROP CONSTRAINT IF EXISTS produtos_producao_diaria_exclusivo_encomenda;
-- =====================================================================================
