-- Adiciona coluna de posicionamento de banner para promoções do tipo 'destaque'.
-- Valores: 'topo' | 'meio' | 'rodape' (posição no catálogo).
-- NULL = não definido (frontend usa 'topo' como fallback).

ALTER TABLE promocoes
  ADD COLUMN IF NOT EXISTS posicao_exibicao text
  CONSTRAINT promocoes_posicao_exibicao_check
    CHECK (posicao_exibicao IN ('topo', 'meio', 'rodape'));

COMMENT ON COLUMN promocoes.posicao_exibicao IS
  'Posição de exibição no catálogo (apenas tipo destaque): topo | meio | rodape';
