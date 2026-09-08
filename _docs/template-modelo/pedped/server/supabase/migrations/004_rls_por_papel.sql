-- =====================================================================================
-- MIGRATION: Redesenho de RLS baseado em papéis (RBAC)
-- Versão: 004
-- Fase do Plano: 2.2
-- Descrição: Substitui as políticas "Admin full access ... (auth.uid() IS NOT NULL)"
--            por políticas baseadas em `has_role()`. Mantém leitura pública do
--            catálogo já existente (anônimos).
-- Pré-requisito: 003 (usuarios + helpers RBAC).
-- Observação: políticas específicas de `entregador` sobre `pedidos`/itens dependem da
--             coluna `pedidos.entregador_id`, criada na migration 008 (2.8) — onde
--             elas são adicionadas.
-- =====================================================================================

BEGIN;

-- Derruba todas as policies "Admin full access ..." legadas
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND policyname LIKE 'Admin full access%'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- LOJA — gerente+ escreve; leitura pública preexistente
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Manage loja (gerente+)" ON public.loja;
CREATE POLICY "Manage loja (gerente+)" ON public.loja
FOR ALL
USING (public.has_role(ARRAY['gerente','administrador','proprietario']::role_usuario_enum[]))
WITH CHECK (public.has_role(ARRAY['gerente','administrador','proprietario']::role_usuario_enum[]));

-- ---------------------------------------------------------------------------
-- CATÁLOGO — gerente+ escreve; leitura pública filtrada
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Manage categorias (gerente+)" ON public.categorias;
CREATE POLICY "Manage categorias (gerente+)" ON public.categorias
FOR ALL
USING (public.has_role(ARRAY['gerente','administrador','proprietario']::role_usuario_enum[]))
WITH CHECK (public.has_role(ARRAY['gerente','administrador','proprietario']::role_usuario_enum[]));

DROP POLICY IF EXISTS "Manage produtos (gerente+)" ON public.produtos;
CREATE POLICY "Manage produtos (gerente+)" ON public.produtos
FOR ALL
USING (public.has_role(ARRAY['gerente','administrador','proprietario']::role_usuario_enum[]))
WITH CHECK (public.has_role(ARRAY['gerente','administrador','proprietario']::role_usuario_enum[]));

DROP POLICY IF EXISTS "Staff read produtos" ON public.produtos;
CREATE POLICY "Staff read produtos" ON public.produtos
FOR SELECT
USING (public.is_staff());

DROP POLICY IF EXISTS "Manage kits (gerente+)" ON public.kits;
CREATE POLICY "Manage kits (gerente+)" ON public.kits
FOR ALL
USING (public.has_role(ARRAY['gerente','administrador','proprietario']::role_usuario_enum[]))
WITH CHECK (public.has_role(ARRAY['gerente','administrador','proprietario']::role_usuario_enum[]));

DROP POLICY IF EXISTS "Public read kits" ON public.kits;
CREATE POLICY "Public read kits" ON public.kits
FOR SELECT
USING (disponivel = true);

DROP POLICY IF EXISTS "Manage kit_itens (gerente+)" ON public.kit_itens;
CREATE POLICY "Manage kit_itens (gerente+)" ON public.kit_itens
FOR ALL
USING (public.has_role(ARRAY['gerente','administrador','proprietario']::role_usuario_enum[]))
WITH CHECK (public.has_role(ARRAY['gerente','administrador','proprietario']::role_usuario_enum[]));

DROP POLICY IF EXISTS "Public read kit_itens" ON public.kit_itens;
CREATE POLICY "Public read kit_itens" ON public.kit_itens
FOR SELECT
USING (
  EXISTS (SELECT 1 FROM public.kits k WHERE k.id = kit_itens.kit_id AND k.disponivel = true)
);

DROP POLICY IF EXISTS "Manage promocoes (gerente+)" ON public.promocoes;
CREATE POLICY "Manage promocoes (gerente+)" ON public.promocoes
FOR ALL
USING (public.has_role(ARRAY['gerente','administrador','proprietario']::role_usuario_enum[]))
WITH CHECK (public.has_role(ARRAY['gerente','administrador','proprietario']::role_usuario_enum[]));

DROP POLICY IF EXISTS "Public read promocoes" ON public.promocoes;
CREATE POLICY "Public read promocoes" ON public.promocoes
FOR SELECT
USING (ativa = true);

DROP POLICY IF EXISTS "Manage promocao_produtos (gerente+)" ON public.promocao_produtos;
CREATE POLICY "Manage promocao_produtos (gerente+)" ON public.promocao_produtos
FOR ALL
USING (public.has_role(ARRAY['gerente','administrador','proprietario']::role_usuario_enum[]))
WITH CHECK (public.has_role(ARRAY['gerente','administrador','proprietario']::role_usuario_enum[]));

DROP POLICY IF EXISTS "Public read promocao_produtos" ON public.promocao_produtos;
CREATE POLICY "Public read promocao_produtos" ON public.promocao_produtos
FOR SELECT
USING (
  EXISTS (SELECT 1 FROM public.promocoes p WHERE p.id = promocao_produtos.promocao_id AND p.ativa = true)
);

-- ---------------------------------------------------------------------------
-- CLIENTES / ENDERECOS / SESSOES — leitura/escrita por staff
-- (Acesso do entregador a estes recursos é concedido na migration 008,
-- após existir `pedidos.entregador_id`.)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Staff manage clientes" ON public.clientes;
CREATE POLICY "Staff manage clientes" ON public.clientes
FOR ALL
USING (public.is_staff())
WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "Staff manage enderecos_cliente" ON public.enderecos_cliente;
CREATE POLICY "Staff manage enderecos_cliente" ON public.enderecos_cliente
FOR ALL
USING (public.is_staff())
WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "Staff manage sessoes" ON public.sessoes;
CREATE POLICY "Staff manage sessoes" ON public.sessoes
FOR ALL
USING (public.is_staff())
WITH CHECK (public.is_staff());

-- ---------------------------------------------------------------------------
-- PEDIDOS — staff lê tudo; gravação por papel.
-- Validação fina de transições de status fica no server (atualizada em 6.x).
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Staff read pedidos" ON public.pedidos;
CREATE POLICY "Staff read pedidos" ON public.pedidos
FOR SELECT
USING (public.is_staff());

DROP POLICY IF EXISTS "Staff insert pedidos" ON public.pedidos;
CREATE POLICY "Staff insert pedidos" ON public.pedidos
FOR INSERT
WITH CHECK (public.has_role(ARRAY['atendente','gerente','administrador','proprietario']::role_usuario_enum[]));

DROP POLICY IF EXISTS "Staff update pedidos" ON public.pedidos;
CREATE POLICY "Staff update pedidos" ON public.pedidos
FOR UPDATE
USING (public.has_role(ARRAY['atendente','producao','gerente','administrador','proprietario']::role_usuario_enum[]))
WITH CHECK (public.has_role(ARRAY['atendente','producao','gerente','administrador','proprietario']::role_usuario_enum[]));

DROP POLICY IF EXISTS "Delete pedidos (admin+)" ON public.pedidos;
CREATE POLICY "Delete pedidos (admin+)" ON public.pedidos
FOR DELETE
USING (public.has_role(ARRAY['administrador','proprietario']::role_usuario_enum[]));

-- ITENS_PEDIDO — staff gerencia
DROP POLICY IF EXISTS "Staff manage itens_pedido" ON public.itens_pedido;
CREATE POLICY "Staff manage itens_pedido" ON public.itens_pedido
FOR ALL
USING (public.is_staff())
WITH CHECK (public.is_staff());

COMMIT;
