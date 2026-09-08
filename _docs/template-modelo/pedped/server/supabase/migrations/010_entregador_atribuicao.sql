-- =====================================================================================
-- MIGRATION: Atribuição de entregador ao pedido
-- Versão: 010
-- Fase do Plano: 2.8
-- Descrição:
--   - pedidos.entregador_id (FK -> usuarios) + atribuido_em
--   - índice parcial "entregas em andamento" (saiu_para_entrega)
--   - função is_entregador_disponivel(entregador uuid)
--   - políticas RLS específicas de entregador (que dependem de entregador_id)
-- Pré-requisitos: 003 (usuarios), 004 (RLS por papel).
-- =====================================================================================

BEGIN;

ALTER TABLE public.pedidos
  ADD COLUMN IF NOT EXISTS entregador_id uuid REFERENCES public.usuarios(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS atribuido_em timestamptz;

COMMENT ON COLUMN public.pedidos.entregador_id IS 'Entregador atribuído (FK -> usuarios.id, role=entregador).';
COMMENT ON COLUMN public.pedidos.atribuido_em IS 'Timestamp da atribuição automática.';

-- Índice parcial: entregas atualmente em andamento por entregador
CREATE INDEX IF NOT EXISTS idx_pedidos_em_entrega
ON public.pedidos (entregador_id)
WHERE entregador_id IS NOT NULL AND status = 'saiu_para_entrega';

-- Função: entregador está disponível (= ativo, role='entregador', sem pedido em andamento)
CREATE OR REPLACE FUNCTION public.is_entregador_disponivel(p_entregador uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.usuarios u
    WHERE u.id = p_entregador AND u.role = 'entregador' AND u.ativo = true
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.pedidos p
    WHERE p.entregador_id = p_entregador
      AND p.status = 'saiu_para_entrega'
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_entregador_disponivel(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_entregador_disponivel(uuid) TO authenticated;

-- =====================================================================================
-- POLÍTICAS DE ENTREGADOR (dependem de entregador_id)
-- =====================================================================================

-- Pedidos: entregador lê os próprios
DROP POLICY IF EXISTS "Entregador read own pedidos" ON public.pedidos;
CREATE POLICY "Entregador read own pedidos" ON public.pedidos
FOR SELECT
USING (
  public.has_role(ARRAY['entregador']::role_usuario_enum[])
  AND entregador_id = auth.uid()
);

-- Itens do pedido: entregador lê os dos pedidos próprios
DROP POLICY IF EXISTS "Entregador read itens of own pedidos" ON public.itens_pedido;
CREATE POLICY "Entregador read itens of own pedidos" ON public.itens_pedido
FOR SELECT
USING (
  public.has_role(ARRAY['entregador']::role_usuario_enum[])
  AND EXISTS (
    SELECT 1 FROM public.pedidos pe
    WHERE pe.id = itens_pedido.pedido_id AND pe.entregador_id = auth.uid()
  )
);

-- Cliente do pedido próprio (entregador lê o necessário para entregar)
DROP POLICY IF EXISTS "Entregador read cliente of own pedidos" ON public.clientes;
CREATE POLICY "Entregador read cliente of own pedidos" ON public.clientes
FOR SELECT
USING (
  public.has_role(ARRAY['entregador']::role_usuario_enum[])
  AND EXISTS (
    SELECT 1 FROM public.pedidos pe
    WHERE pe.cliente_id = clientes.id AND pe.entregador_id = auth.uid()
  )
);

-- Endereço do pedido próprio
DROP POLICY IF EXISTS "Entregador read endereco of own pedidos" ON public.enderecos_cliente;
CREATE POLICY "Entregador read endereco of own pedidos" ON public.enderecos_cliente
FOR SELECT
USING (
  public.has_role(ARRAY['entregador']::role_usuario_enum[])
  AND EXISTS (
    SELECT 1 FROM public.pedidos pe
    WHERE pe.endereco_id = enderecos_cliente.id AND pe.entregador_id = auth.uid()
  )
);

COMMIT;
