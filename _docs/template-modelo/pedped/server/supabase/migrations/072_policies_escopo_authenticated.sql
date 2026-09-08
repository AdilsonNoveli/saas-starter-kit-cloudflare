-- =====================================================================================
-- MIGRATION: Restringe policies de staff/gestão ao papel `authenticated`
-- Versão: 072
-- =====================================================================================
-- CONTEXTO (auditoria, 2026-07-20):
--   As policies de gestão/staff foram criadas sem cláusula `TO`, o que em Postgres
--   equivale a `TO PUBLIC` — ou seja, valem também para `anon`. Como o corpo delas
--   chama `private.has_role()` / `private.is_staff()`, e `anon` não tem EXECUTE
--   nessas funções, QUALQUER SELECT de `anon` nessas tabelas aborta com:
--
--       ERROR: 42501: permission denied for function has_role
--
--   O erro ocorre mesmo existindo uma policy pública de leitura: numa consulta,
--   o Postgres avalia todas as policies permissivas aplicáveis, e a de gestão
--   estoura antes de a pública poder liberar a linha.
--
--   Consequência prática: o catálogo público só funciona hoje porque as rotas de
--   servidor usam `service_role` (que faz bypass de RLS). Não é uma escolha de
--   arquitetura — é uma dependência acidental deste defeito. Enquanto ele existir,
--   nenhuma rota pública pode migrar para o client sob RLS.
--
--   Precedente no próprio banco: a policy "Manage cupons (gerente+)" JÁ está
--   restrita a `TO authenticated` e, por isso, `anon` lê `cupons` sem erro
--   (retornando zero linhas, como esperado). Esta migration apenas alinha as
--   demais ao mesmo padrão.
--
-- SEGURANÇA:
--   Não afrouxa nada. Policies de gestão nunca fizeram sentido para `anon`:
--   `has_role()`/`is_staff()` dependem de `auth.uid()`, que é NULL para anônimo,
--   logo elas jamais concederiam acesso. Restringi-las a `authenticated` remove
--   apenas a avaliação que hoje falha. `service_role` segue com bypass de RLS.
--
-- IDEMPOTÊNCIA: `ALTER POLICY` é declarativo; reexecutar é inócuo.
-- =====================================================================================

BEGIN;

-- Catálogo público (tabelas com leitura anônima legítima) -----------------------
ALTER POLICY "Manage categorias (gerente+)"            ON public.categorias            TO authenticated;
ALTER POLICY "Manage produtos (gerente+)"              ON public.produtos              TO authenticated;
ALTER POLICY "Staff read produtos"                     ON public.produtos              TO authenticated;
ALTER POLICY "Manage kits (gerente+)"                  ON public.kits                  TO authenticated;
ALTER POLICY "Manage kit_itens (gerente+)"             ON public.kit_itens             TO authenticated;
ALTER POLICY "Manage promocoes (gerente+)"             ON public.promocoes             TO authenticated;
ALTER POLICY "Manage promocao_produtos (gerente+)"     ON public.promocao_produtos     TO authenticated;
ALTER POLICY "Manage produto_relacionados (gerente+)"  ON public.produto_relacionados  TO authenticated;
ALTER POLICY "Manage produto_opcao_grupo (gerente+)"   ON public.produto_opcao_grupo   TO authenticated;
ALTER POLICY "Manage produto_opcao_item (gerente+)"    ON public.produto_opcao_item    TO authenticated;
ALTER POLICY "Manage loja (gerente+)"                  ON public.loja                  TO authenticated;
ALTER POLICY "Manage paginas (gerente+)"               ON public.paginas               TO authenticated;
ALTER POLICY "Manage regras_frete (gerente+)"          ON public.regras_frete_distancia TO authenticated;
ALTER POLICY "Staff manage sessoes"                    ON public.sessoes               TO authenticated;

-- Tabelas sem leitura pública: alinhadas pelo mesmo motivo (consistência e para
-- que um SELECT anônimo retorne vazio em vez de erro 42501).
ALTER POLICY "Staff manage clientes"                   ON public.clientes              TO authenticated;
ALTER POLICY "Entregador read cliente of own pedidos"  ON public.clientes              TO authenticated;
ALTER POLICY "Staff manage enderecos_cliente"          ON public.enderecos_cliente     TO authenticated;
ALTER POLICY "Entregador read endereco of own pedidos" ON public.enderecos_cliente     TO authenticated;
ALTER POLICY "Staff read pedidos"                      ON public.pedidos               TO authenticated;
ALTER POLICY "Staff insert pedidos"                    ON public.pedidos               TO authenticated;
ALTER POLICY "Staff update pedidos"                    ON public.pedidos               TO authenticated;
ALTER POLICY "Delete pedidos (admin+)"                 ON public.pedidos               TO authenticated;
ALTER POLICY "Entregador read own pedidos"             ON public.pedidos               TO authenticated;
ALTER POLICY "Staff manage itens_pedido"               ON public.itens_pedido          TO authenticated;
ALTER POLICY "Entregador read itens of own pedidos"    ON public.itens_pedido          TO authenticated;
ALTER POLICY "Staff manage itens_pedido_opcoes"        ON public.itens_pedido_opcoes   TO authenticated;
ALTER POLICY "Staff read pedido_status_historico"      ON public.pedido_status_historico TO authenticated;
ALTER POLICY "Manage kanban_coluna (gerente+)"         ON public.kanban_coluna         TO authenticated;
ALTER POLICY "Staff read kanban_coluna"                ON public.kanban_coluna         TO authenticated;
ALTER POLICY "Staff read evento_rastreamento"          ON public.evento_rastreamento   TO authenticated;
ALTER POLICY "Admins manage usuarios"                  ON public.usuarios              TO authenticated;
ALTER POLICY "Staff read all usuarios"                 ON public.usuarios              TO authenticated;
ALTER POLICY "Staff read webhook_outbox"               ON public.webhook_outbox        TO authenticated;

COMMIT;

-- =====================================================================================
-- VERIFICAÇÃO PÓS-APLICAÇÃO (deve retornar linhas, sem erro 42501):
--
--   SET LOCAL ROLE anon;
--   SELECT count(*) FROM categorias WHERE ativa = true;
--   SELECT count(*) FROM produtos   WHERE disponivel = true;
--   SELECT count(*) FROM kits       WHERE disponivel = true;
--
-- Só depois disso as rotas públicas podem migrar de `serverSupabaseServiceRole`
-- para `serverSupabaseClient`.
-- =====================================================================================
