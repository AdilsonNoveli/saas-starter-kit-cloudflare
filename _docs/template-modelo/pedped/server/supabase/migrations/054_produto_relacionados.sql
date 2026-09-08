-- Tabela de associação para produtos relacionados (exibidos no checkout).
-- Máximo 3 por produto (validado na camada de aplicação).

CREATE TABLE IF NOT EXISTS produto_relacionados (
  produto_id             uuid NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
  produto_relacionado_id uuid NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
  ordem                  integer NOT NULL DEFAULT 0,
  PRIMARY KEY (produto_id, produto_relacionado_id),
  CONSTRAINT no_self_relation CHECK (produto_id <> produto_relacionado_id)
);

CREATE INDEX IF NOT EXISTS idx_produto_relacionados_produto_id ON produto_relacionados(produto_id);

-- RLS: somente service_role pode acessar (admin + server-side API)
ALTER TABLE produto_relacionados ENABLE ROW LEVEL SECURITY;

CREATE POLICY "deny all anon" ON produto_relacionados
  FOR ALL TO anon USING (false);

CREATE POLICY "deny all authenticated" ON produto_relacionados
  FOR ALL TO authenticated USING (false);

COMMENT ON TABLE produto_relacionados IS
  'Produtos sugeridos no checkout quando o produto principal está no carrinho.';
