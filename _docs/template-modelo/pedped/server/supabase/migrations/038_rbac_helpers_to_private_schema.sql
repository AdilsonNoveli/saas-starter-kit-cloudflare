BEGIN;

-- =====================================================================================
-- MIGRATION 038: Move helpers RBAC para schema `private` (fora do PostgREST)
-- Resolve os 4 avisos 0029 (has_role/is_staff/current_user_role/is_entregador_disponivel):
-- funções em `private` não são expostas como RPC, mas continuam usáveis pela RLS.
-- SECURITY DEFINER é mantido (obrigatório: has_role lê `usuarios`, cujas policies
-- chamam has_role — sem DEFINER haveria recursão de RLS).
-- Grants replicados EXATAMENTE (authenticated + service_role) → comportamento idêntico.
-- =====================================================================================
SET search_path = public, pg_catalog;

CREATE SCHEMA IF NOT EXISTS private;
-- USAGE para todos os roles-cliente: a resolução do nome nunca falha no schema;
-- o controle real continua no EXECUTE (só authenticated/service_role têm).
GRANT USAGE ON SCHEMA private TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION private.has_role(roles public.role_usuario_enum[])
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.usuarios u
    WHERE u.id = auth.uid() AND u.ativo = true AND u.role = ANY(roles)
  );
$$;

CREATE OR REPLACE FUNCTION private.is_staff()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.usuarios u
    WHERE u.id = auth.uid() AND u.ativo = true
      AND u.role IN ('atendente','producao','gerente','administrador','proprietario')
  );
$$;

CREATE OR REPLACE FUNCTION private.current_user_role()
RETURNS public.role_usuario_enum LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog'
AS $$
  SELECT u.role FROM public.usuarios u WHERE u.id = auth.uid() AND u.ativo = true;
$$;

CREATE OR REPLACE FUNCTION private.is_entregador_disponivel(p_entregador uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.usuarios u
    WHERE u.id = p_entregador AND u.role = 'entregador' AND u.ativo = true
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.pedidos p
    WHERE p.entregador_id = p_entregador AND p.status = 'saiu_para_entrega'
  );
$$;

REVOKE EXECUTE ON FUNCTION private.has_role(public.role_usuario_enum[])   FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION private.is_staff()                             FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION private.current_user_role()                    FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION private.is_entregador_disponivel(uuid)         FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION private.has_role(public.role_usuario_enum[])   TO authenticated, service_role;
GRANT  EXECUTE ON FUNCTION private.is_staff()                             TO authenticated, service_role;
GRANT  EXECUTE ON FUNCTION private.current_user_role()                    TO authenticated, service_role;
GRANT  EXECUTE ON FUNCTION private.is_entregador_disponivel(uuid)         TO authenticated, service_role;

-- Repontar funções dependentes (chamavam public.has_role)
CREATE OR REPLACE FUNCTION public.set_revenue_status(p_chave text)
RETURNS void LANGUAGE plpgsql
SET search_path TO 'public', 'pg_catalog'
AS $$
BEGIN
  IF NOT private.has_role(ARRAY['gerente','administrador','proprietario']::public.role_usuario_enum[]) THEN
    RAISE EXCEPTION 'Permission denied: papel gerente ou superior exigido.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.kanban_coluna WHERE chave = p_chave) THEN
    RAISE EXCEPTION 'Coluna kanban "%" não encontrada.', p_chave;
  END IF;
  UPDATE public.kanban_coluna
  SET is_revenue_trigger = (chave = p_chave)
  WHERE is_revenue_trigger IS DISTINCT FROM (chave = p_chave);
END;
$$;

CREATE OR REPLACE FUNCTION public.prevent_self_privilege_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  IF auth.uid() IS NOT NULL
     AND auth.uid() = OLD.id
     AND (NEW.role IS DISTINCT FROM OLD.role OR NEW.ativo IS DISTINCT FROM OLD.ativo)
     AND NOT private.has_role(ARRAY['administrador','proprietario']::public.role_usuario_enum[]) THEN
    RAISE EXCEPTION 'Alteração do próprio papel/status não é permitida.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN NEW;
END;
$$;

-- ─── Recriação das policies apontando para private.* ─────────────────────────
-- 31 policies recriadas
DROP POLICY IF EXISTS "Manage categorias (gerente+)" ON public.categorias;
CREATE POLICY "Manage categorias (gerente+)" ON public.categorias
  FOR ALL TO public
  USING (private.has_role(ARRAY['gerente'::role_usuario_enum, 'administrador'::role_usuario_enum, 'proprietario'::role_usuario_enum]))
  WITH CHECK (private.has_role(ARRAY['gerente'::role_usuario_enum, 'administrador'::role_usuario_enum, 'proprietario'::role_usuario_enum]));

DROP POLICY IF EXISTS "Entregador read cliente of own pedidos" ON public.clientes;
CREATE POLICY "Entregador read cliente of own pedidos" ON public.clientes
  FOR SELECT TO public
  USING ((private.has_role(ARRAY['entregador'::role_usuario_enum]) AND (EXISTS ( SELECT 1
   FROM pedidos pe
  WHERE ((pe.cliente_id = clientes.id) AND (pe.entregador_id = auth.uid()))))));

DROP POLICY IF EXISTS "Staff manage clientes" ON public.clientes;
CREATE POLICY "Staff manage clientes" ON public.clientes
  FOR ALL TO public
  USING (private.is_staff())
  WITH CHECK (private.is_staff());

DROP POLICY IF EXISTS "Entregador read endereco of own pedidos" ON public.enderecos_cliente;
CREATE POLICY "Entregador read endereco of own pedidos" ON public.enderecos_cliente
  FOR SELECT TO public
  USING ((private.has_role(ARRAY['entregador'::role_usuario_enum]) AND (EXISTS ( SELECT 1
   FROM pedidos pe
  WHERE ((pe.endereco_id = enderecos_cliente.id) AND (pe.entregador_id = auth.uid()))))));

DROP POLICY IF EXISTS "Staff manage enderecos_cliente" ON public.enderecos_cliente;
CREATE POLICY "Staff manage enderecos_cliente" ON public.enderecos_cliente
  FOR ALL TO public
  USING (private.is_staff())
  WITH CHECK (private.is_staff());

DROP POLICY IF EXISTS "Staff read evento_rastreamento" ON public.evento_rastreamento;
CREATE POLICY "Staff read evento_rastreamento" ON public.evento_rastreamento
  FOR SELECT TO public
  USING (private.is_staff());

DROP POLICY IF EXISTS "Entregador read itens of own pedidos" ON public.itens_pedido;
CREATE POLICY "Entregador read itens of own pedidos" ON public.itens_pedido
  FOR SELECT TO public
  USING ((private.has_role(ARRAY['entregador'::role_usuario_enum]) AND (EXISTS ( SELECT 1
   FROM pedidos pe
  WHERE ((pe.id = itens_pedido.pedido_id) AND (pe.entregador_id = auth.uid()))))));

DROP POLICY IF EXISTS "Staff manage itens_pedido" ON public.itens_pedido;
CREATE POLICY "Staff manage itens_pedido" ON public.itens_pedido
  FOR ALL TO public
  USING (private.is_staff())
  WITH CHECK (private.is_staff());

DROP POLICY IF EXISTS "Staff manage itens_pedido_opcoes" ON public.itens_pedido_opcoes;
CREATE POLICY "Staff manage itens_pedido_opcoes" ON public.itens_pedido_opcoes
  FOR ALL TO public
  USING (private.is_staff())
  WITH CHECK (private.is_staff());

DROP POLICY IF EXISTS "Manage kanban_coluna (gerente+)" ON public.kanban_coluna;
CREATE POLICY "Manage kanban_coluna (gerente+)" ON public.kanban_coluna
  FOR ALL TO public
  USING (private.has_role(ARRAY['gerente'::role_usuario_enum, 'administrador'::role_usuario_enum, 'proprietario'::role_usuario_enum]))
  WITH CHECK (private.has_role(ARRAY['gerente'::role_usuario_enum, 'administrador'::role_usuario_enum, 'proprietario'::role_usuario_enum]));

DROP POLICY IF EXISTS "Staff read kanban_coluna" ON public.kanban_coluna;
CREATE POLICY "Staff read kanban_coluna" ON public.kanban_coluna
  FOR SELECT TO public
  USING (private.is_staff());

DROP POLICY IF EXISTS "Manage kit_itens (gerente+)" ON public.kit_itens;
CREATE POLICY "Manage kit_itens (gerente+)" ON public.kit_itens
  FOR ALL TO public
  USING (private.has_role(ARRAY['gerente'::role_usuario_enum, 'administrador'::role_usuario_enum, 'proprietario'::role_usuario_enum]))
  WITH CHECK (private.has_role(ARRAY['gerente'::role_usuario_enum, 'administrador'::role_usuario_enum, 'proprietario'::role_usuario_enum]));

DROP POLICY IF EXISTS "Manage kits (gerente+)" ON public.kits;
CREATE POLICY "Manage kits (gerente+)" ON public.kits
  FOR ALL TO public
  USING (private.has_role(ARRAY['gerente'::role_usuario_enum, 'administrador'::role_usuario_enum, 'proprietario'::role_usuario_enum]))
  WITH CHECK (private.has_role(ARRAY['gerente'::role_usuario_enum, 'administrador'::role_usuario_enum, 'proprietario'::role_usuario_enum]));

DROP POLICY IF EXISTS "Manage loja (gerente+)" ON public.loja;
CREATE POLICY "Manage loja (gerente+)" ON public.loja
  FOR ALL TO public
  USING (private.has_role(ARRAY['gerente'::role_usuario_enum, 'administrador'::role_usuario_enum, 'proprietario'::role_usuario_enum]))
  WITH CHECK (private.has_role(ARRAY['gerente'::role_usuario_enum, 'administrador'::role_usuario_enum, 'proprietario'::role_usuario_enum]));

DROP POLICY IF EXISTS "Staff read pedido_status_historico" ON public.pedido_status_historico;
CREATE POLICY "Staff read pedido_status_historico" ON public.pedido_status_historico
  FOR SELECT TO public
  USING (private.is_staff());

DROP POLICY IF EXISTS "Delete pedidos (admin+)" ON public.pedidos;
CREATE POLICY "Delete pedidos (admin+)" ON public.pedidos
  FOR DELETE TO public
  USING (private.has_role(ARRAY['administrador'::role_usuario_enum, 'proprietario'::role_usuario_enum]));

DROP POLICY IF EXISTS "Entregador read own pedidos" ON public.pedidos;
CREATE POLICY "Entregador read own pedidos" ON public.pedidos
  FOR SELECT TO public
  USING ((private.has_role(ARRAY['entregador'::role_usuario_enum]) AND (entregador_id = auth.uid())));

DROP POLICY IF EXISTS "Staff insert pedidos" ON public.pedidos;
CREATE POLICY "Staff insert pedidos" ON public.pedidos
  FOR INSERT TO public
  WITH CHECK (private.has_role(ARRAY['atendente'::role_usuario_enum, 'gerente'::role_usuario_enum, 'administrador'::role_usuario_enum, 'proprietario'::role_usuario_enum]));

DROP POLICY IF EXISTS "Staff read pedidos" ON public.pedidos;
CREATE POLICY "Staff read pedidos" ON public.pedidos
  FOR SELECT TO public
  USING (private.is_staff());

DROP POLICY IF EXISTS "Staff update pedidos" ON public.pedidos;
CREATE POLICY "Staff update pedidos" ON public.pedidos
  FOR UPDATE TO public
  USING (private.has_role(ARRAY['atendente'::role_usuario_enum, 'producao'::role_usuario_enum, 'gerente'::role_usuario_enum, 'administrador'::role_usuario_enum, 'proprietario'::role_usuario_enum]))
  WITH CHECK (private.has_role(ARRAY['atendente'::role_usuario_enum, 'producao'::role_usuario_enum, 'gerente'::role_usuario_enum, 'administrador'::role_usuario_enum, 'proprietario'::role_usuario_enum]));

DROP POLICY IF EXISTS "Manage produto_opcao_grupo (gerente+)" ON public.produto_opcao_grupo;
CREATE POLICY "Manage produto_opcao_grupo (gerente+)" ON public.produto_opcao_grupo
  FOR ALL TO public
  USING (private.has_role(ARRAY['gerente'::role_usuario_enum, 'administrador'::role_usuario_enum, 'proprietario'::role_usuario_enum]))
  WITH CHECK (private.has_role(ARRAY['gerente'::role_usuario_enum, 'administrador'::role_usuario_enum, 'proprietario'::role_usuario_enum]));

DROP POLICY IF EXISTS "Manage produto_opcao_item (gerente+)" ON public.produto_opcao_item;
CREATE POLICY "Manage produto_opcao_item (gerente+)" ON public.produto_opcao_item
  FOR ALL TO public
  USING (private.has_role(ARRAY['gerente'::role_usuario_enum, 'administrador'::role_usuario_enum, 'proprietario'::role_usuario_enum]))
  WITH CHECK (private.has_role(ARRAY['gerente'::role_usuario_enum, 'administrador'::role_usuario_enum, 'proprietario'::role_usuario_enum]));

DROP POLICY IF EXISTS "Manage produtos (gerente+)" ON public.produtos;
CREATE POLICY "Manage produtos (gerente+)" ON public.produtos
  FOR ALL TO public
  USING (private.has_role(ARRAY['gerente'::role_usuario_enum, 'administrador'::role_usuario_enum, 'proprietario'::role_usuario_enum]))
  WITH CHECK (private.has_role(ARRAY['gerente'::role_usuario_enum, 'administrador'::role_usuario_enum, 'proprietario'::role_usuario_enum]));

DROP POLICY IF EXISTS "Staff read produtos" ON public.produtos;
CREATE POLICY "Staff read produtos" ON public.produtos
  FOR SELECT TO public
  USING (private.is_staff());

DROP POLICY IF EXISTS "Manage promocao_produtos (gerente+)" ON public.promocao_produtos;
CREATE POLICY "Manage promocao_produtos (gerente+)" ON public.promocao_produtos
  FOR ALL TO public
  USING (private.has_role(ARRAY['gerente'::role_usuario_enum, 'administrador'::role_usuario_enum, 'proprietario'::role_usuario_enum]))
  WITH CHECK (private.has_role(ARRAY['gerente'::role_usuario_enum, 'administrador'::role_usuario_enum, 'proprietario'::role_usuario_enum]));

DROP POLICY IF EXISTS "Manage promocoes (gerente+)" ON public.promocoes;
CREATE POLICY "Manage promocoes (gerente+)" ON public.promocoes
  FOR ALL TO public
  USING (private.has_role(ARRAY['gerente'::role_usuario_enum, 'administrador'::role_usuario_enum, 'proprietario'::role_usuario_enum]))
  WITH CHECK (private.has_role(ARRAY['gerente'::role_usuario_enum, 'administrador'::role_usuario_enum, 'proprietario'::role_usuario_enum]));

DROP POLICY IF EXISTS "Staff manage sessoes" ON public.sessoes;
CREATE POLICY "Staff manage sessoes" ON public.sessoes
  FOR ALL TO public
  USING (private.is_staff())
  WITH CHECK (private.is_staff());

DROP POLICY IF EXISTS "Admins manage usuarios" ON public.usuarios;
CREATE POLICY "Admins manage usuarios" ON public.usuarios
  FOR ALL TO public
  USING (private.has_role(ARRAY['administrador'::role_usuario_enum, 'proprietario'::role_usuario_enum]))
  WITH CHECK (private.has_role(ARRAY['administrador'::role_usuario_enum, 'proprietario'::role_usuario_enum]));

DROP POLICY IF EXISTS "Staff read all usuarios" ON public.usuarios;
CREATE POLICY "Staff read all usuarios" ON public.usuarios
  FOR SELECT TO public
  USING (private.has_role(ARRAY['gerente'::role_usuario_enum, 'administrador'::role_usuario_enum, 'proprietario'::role_usuario_enum]));

DROP POLICY IF EXISTS "Staff read webhook_outbox" ON public.webhook_outbox;
CREATE POLICY "Staff read webhook_outbox" ON public.webhook_outbox
  FOR SELECT TO public
  USING (private.has_role(ARRAY['gerente'::role_usuario_enum, 'administrador'::role_usuario_enum, 'proprietario'::role_usuario_enum]));

DROP POLICY IF EXISTS "Manage regras_frete (gerente+)" ON public.regras_frete_distancia;
CREATE POLICY "Manage regras_frete (gerente+)" ON public.regras_frete_distancia
  FOR ALL TO public
  USING (private.has_role(ARRAY['gerente'::role_usuario_enum, 'administrador'::role_usuario_enum, 'proprietario'::role_usuario_enum]))
  WITH CHECK (private.has_role(ARRAY['gerente'::role_usuario_enum, 'administrador'::role_usuario_enum, 'proprietario'::role_usuario_enum]));


-- ─── Remover as versões public (sem dependentes após o repontamento) ─────────
DROP FUNCTION public.has_role(public.role_usuario_enum[]);
DROP FUNCTION public.is_staff();
DROP FUNCTION public.current_user_role();
DROP FUNCTION public.is_entregador_disponivel(uuid);

COMMIT;
