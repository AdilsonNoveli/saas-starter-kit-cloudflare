-- Cupons de desconto alfanuméricos.
-- Suportam percentual ou valor fixo, janela de validade e limite de usos.
-- Acesso exclusivo via service_role (BFF); anon e authenticated são negados.

BEGIN;

CREATE TABLE IF NOT EXISTS public.cupons (
  id              uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo          text        NOT NULL UNIQUE,
  descricao       text,
  tipo_desconto   text        NOT NULL DEFAULT 'percentual'
    CONSTRAINT cupons_tipo_check CHECK (tipo_desconto IN ('percentual', 'fixo')),
  valor           numeric     NOT NULL CHECK (valor > 0),
  valor_minimo    numeric     NOT NULL DEFAULT 0,
  uso_maximo      int,
  uso_atual       int         NOT NULL DEFAULT 0 CHECK (uso_atual >= 0),
  ativo           boolean     NOT NULL DEFAULT true,
  data_inicio     timestamptz,
  data_fim        timestamptz,
  criado_em       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.cupons ENABLE ROW LEVEL SECURITY;

-- Clientes e usuários autenticados nunca acessam esta tabela diretamente.
CREATE POLICY "cupons: deny client access" ON public.cupons
  FOR ALL TO anon, authenticated
  USING (false) WITH CHECK (false);

-- Incremento atômico de uso (chamado pelo BFF após pedido confirmado).
CREATE OR REPLACE FUNCTION public.increment_cupom_uso(p_cupom_id uuid)
RETURNS void
LANGUAGE sql
SECURITY INVOKER
SET search_path TO 'public', 'pg_catalog'
AS $$
  UPDATE public.cupons SET uso_atual = uso_atual + 1 WHERE id = p_cupom_id;
$$;

-- Somente service_role invoca a função; clientes não podem chamar diretamente.
REVOKE EXECUTE ON FUNCTION public.increment_cupom_uso(uuid) FROM PUBLIC, anon, authenticated;

COMMIT;
