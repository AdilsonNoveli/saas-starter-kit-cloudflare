-- Banner: suporte a múltiplas categorias e normalização de posição NULL.

-- 1. Coluna para lista de UUIDs de categorias onde o banner deve aparecer.
--    NULL ou array vazio = usa categoria_id legado (compatibilidade) ou exibe em todas.
ALTER TABLE promocoes
  ADD COLUMN IF NOT EXISTS categorias_ids uuid[];

COMMENT ON COLUMN promocoes.categorias_ids IS
  'IDs de categorias onde o banner (tipo destaque) deve aparecer. NULL/vazio = usa categoria_id ou exibe em todas as categorias.';

-- 2. Normaliza posição de banners existentes: NULL → ''topo'' como fallback permanente.
--    Remove a necessidade de fallback no frontend, evitando que banners sem posição
--    apareçam em todos os locais ao mesmo tempo.
UPDATE promocoes
  SET posicao_exibicao = 'topo'
WHERE tipo = 'destaque'
  AND posicao_exibicao IS NULL;
