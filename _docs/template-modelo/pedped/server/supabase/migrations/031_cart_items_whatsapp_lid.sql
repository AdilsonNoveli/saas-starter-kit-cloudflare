-- ============================================================
-- Migration 031 — Server-side cart + WhatsApp LID mapping
-- Suporte ao fluxo agentivo externo (pedidos via WhatsApp):
--   • cart_items: carrinho real na aplicação, vinculado à sessão.
--     O agente LLM nunca mantém estado — cada mutação passa por aqui.
--   • clientes.whatsapp_lid: identificador @lid da nova API do WhatsApp
--     (privacidade). Lookup de cliente passa a aceitar telefone OU lid.
-- ============================================================

-- ─── clientes.whatsapp_lid ───────────────────────────────────────────────────
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS whatsapp_lid text;

-- Unicidade parcial: NULL permitido (clientes legados), lid não se repete.
CREATE UNIQUE INDEX IF NOT EXISTS clientes_whatsapp_lid_key
  ON public.clientes (whatsapp_lid)
  WHERE whatsapp_lid IS NOT NULL;

-- ─── cart_items ──────────────────────────────────────────────────────────────
-- Carrinho por sessão: TTL herdado da sessão (sessão expirada = carrinho morto).
-- ON DELETE CASCADE cobre limpeza se sessões forem removidas no futuro.
CREATE TABLE IF NOT EXISTS public.cart_items (
  id            uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  sessao_id     uuid    NOT NULL REFERENCES public.sessoes(id) ON DELETE CASCADE,
  produto_id    uuid    NOT NULL REFERENCES public.produtos(id) ON DELETE CASCADE,
  quantidade    numeric NOT NULL CHECK (quantidade > 0),
  criado_em     timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT cart_items_sessao_produto_unique UNIQUE (sessao_id, produto_id)
);

CREATE INDEX IF NOT EXISTS idx_cart_items_sessao
  ON public.cart_items (sessao_id);

DROP TRIGGER IF EXISTS trg_cart_items_updated_at ON public.cart_items;
CREATE TRIGGER trg_cart_items_updated_at
  BEFORE UPDATE ON public.cart_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ─── RLS ─────────────────────────────────────────────────────────────────────
-- Acesso exclusivo via endpoints de integração (service_role, que bypassa RLS).
-- RLS habilitado SEM políticas = deny-all para anon/authenticated.
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
