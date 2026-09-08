-- =====================================================================================
-- MIGRATION 068: Busca Fuzzy de Produtos — pg_trgm + unaccent + índice GIN + RPC
-- =====================================================================================
-- Problema: a busca atual usa ILIKE '%termo%' via PostgREST. Esta abordagem:
--   1) Não tolera erros tipográficos (esfirra ≠ esfiha).
--   2) Não ignora diferenças de acento (cafe ≠ café).
--   3) Executa full-scan — O(n) — mesmo com índice B-Tree (padrão começa com %).
--
-- Solução: pg_trgm (similaridade por trigramas) + unaccent (normalização de acentos)
--   + índice GIN (lookup O(log n)) + função RPC search_products.
--
-- Por que função RPC e não query direta via PostgREST?
--   similarity() e ORDER BY similarity DESC não podem ser expressados na
--   gramática de filtros do PostgREST. Mesmo padrão de catalog_products_page (061).
--
-- Sobre o wrapper f_unaccent (SEÇÃO 2):
--   PostgreSQL exige que TODA função em expressão de índice seja IMMUTABLE.
--   unaccent() nativa é declarada STABLE (poderia variar com reconfiguração do
--   dicionário). Na prática o dicionário é estático, mas o PostgreSQL não pode
--   inferir isso sem declaração explícita. A solução padrão da indústria (usada
--   por GitLab, Discourse, Mastodon) é um wrapper que declara IMMUTABLE
--   explicitamente — isolando a decisão do DBA da declaração do banco.
--
-- Segurança (alinhado com migrations 029, 038, 061):
--   • SECURITY INVOKER + search_path fixo em todas as funções.
--   • search_products: GRANT apenas para service_role.
--   • f_unaccent: transformação pura de texto, sem acesso a tabelas.
--     PUBLIC pode executar (sem dado sensível, necessário para o índice
--     ser avaliado em qualquer contexto de leitura da tabela produtos).
--
-- Idempotência: script pode ser re-executado sem efeito colateral.
--   • CREATE EXTENSION IF NOT EXISTS
--   • CREATE OR REPLACE FUNCTION
--   • CREATE INDEX IF NOT EXISTS
--   • REVOKE/GRANT são idempotentes no PostgreSQL.
-- =====================================================================================

BEGIN;

-- ─── 1. EXTENSÕES ─────────────────────────────────────────────────────────────
-- Schema `extensions` — padrão Supabase, evita o aviso [0014] extension_in_public.
-- Se as extensões já estiverem em outro schema (ex: public), CREATE … IF NOT EXISTS
-- é silenciosamente ignorado (idempotente).
CREATE EXTENSION IF NOT EXISTS pg_trgm  WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA extensions;

-- ─── 2. WRAPPER IMMUTABLE PARA UNACCENT ───────────────────────────────────────
-- Contexto: PostgreSQL proíbe funções STABLE ou VOLATILE em expressões de índice
-- (erro 42P17). unaccent() é declarada STABLE porque teoricamente o dicionário
-- de unaccent poderia mudar com ALTER TEXT SEARCH CONFIGURATION. Na prática,
-- em ambientes de produção o dicionário é estático — o wrapper declara IMMUTABLE
-- assumindo essa invariante de operação (é responsabilidade do DBA não remap ear
-- o dicionário sem recriar o índice, o que é o comportamento correto).
--
-- Padrão amplamente documentado e utilizado:
--   • https://www.postgresql.org/docs/current/indexes-expressional.html
--   • GitLab: https://gitlab.com/gitlab-org/gitlab/-/blob/master/db/migrate/
--   • Discourse: imutable_unaccent wrapper idêntico
--
-- STRICT: retorna NULL para input NULL (não chama unaccent desnecessariamente).
-- PARALLEL SAFE: permite paralelismo de query (nenhuma escrita ou leitura de estado).
CREATE OR REPLACE FUNCTION public.f_unaccent(txt text)
RETURNS text
LANGUAGE sql
IMMUTABLE
STRICT
PARALLEL SAFE
SET search_path = public, extensions, pg_catalog
AS $$
  SELECT extensions.unaccent(txt);
$$;

COMMENT ON FUNCTION public.f_unaccent(text) IS
'Wrapper IMMUTABLE de extensions.unaccent(). Necessário para uso em expressões de índice '
'(PostgreSQL 42P17: funções em índice devem ser IMMUTABLE). '
'Estático na prática: o dicionário unaccent não é reconfigurado em produção.';

-- f_unaccent é transformação pura de texto (sem acesso a tabelas, sem dado sensível).
-- PUBLIC pode executar — necessário para o índice ser avaliado corretamente
-- em leituras da tabela produtos por qualquer role.
GRANT EXECUTE ON FUNCTION public.f_unaccent(text) TO PUBLIC;

-- ─── 3. ÍNDICE GIN ────────────────────────────────────────────────────────────
-- Expressão do índice: f_unaccent(lower(nome || ' ' || COALESCE(descricao, '')))
--
--   • f_unaccent(): normaliza acentos via wrapper IMMUTABLE (obrigatório para índice).
--   • lower(): normaliza caixa. lower() é IMMUTABLE no PostgreSQL — sem wrapper necessário.
--   • nome || ' ' || COALESCE(descricao, ''): concatena nome e descrição em um único
--     campo de busca. COALESCE obrigatório pois descricao é nullable — NULL propagaria
--     e anularia o índice para o produto.
--   • gin_trgm_ops: classe de operadores do pg_trgm para índice GIN.
--     Suporta similarity(), LIKE e ILIKE com uso do índice.
--   • WHERE disponivel: índice parcial — exclui produtos indisponíveis,
--     reduzindo tamanho e mantendo consistência com idx_produtos_rank (migration 061).
--
-- A expressão do índice DEVE ser idêntica à expressão usada nas queries (search_products)
-- para que o planner faça index scan em vez de seq scan.
CREATE INDEX IF NOT EXISTS idx_produtos_trgm_busca
  ON public.produtos
  USING gin (
    public.f_unaccent(lower(nome || ' ' || COALESCE(descricao, '')))
    extensions.gin_trgm_ops
  )
  WHERE disponivel;

COMMENT ON INDEX public.idx_produtos_trgm_busca IS
'Índice GIN para busca fuzzy via pg_trgm em nome + descrição do produto '
'(normalizado: f_unaccent + lower). Parcial: apenas disponivel=true. '
'Expressão deve ser idêntica à usada em search_products().';

-- ─── 4. FUNÇÃO RPC: search_products ──────────────────────────────────────────
-- Retorna os mesmos campos que o endpoint usa na query PostgREST, preservando
-- o contrato IntegrationProduct sem qualquer alteração de tipo.
--
-- Lógica de busca (duas camadas):
--   1) similarity(campo_normalizado, termo_normalizado) >= 0.20
--      Captura erros tipográficos e variações fonéticas.
--      Threshold 0.20: conservador para nomes curtos de produtos alimentícios.
--   2) ILIKE '%termo%' fallback: captura substrings e termos curtos (< 3 chars
--      não geram trigramas suficientes para similarity).
--   OR entre camadas → zero falso-negativo por threshold.
--
-- Ordenação: similarity DESC → mais relevante primeiro. Desempate por nome ASC.
--
-- A expressão f_unaccent(lower(...)) aqui é IDÊNTICA à do índice — garante
-- que o planner use idx_produtos_trgm_busca (index scan) em vez de seq scan.
--
-- Tipo de retorno: TABLE com tipos explícitos — o @supabase/supabase-js infere
-- o tipo via rpc() baseado em database.types.ts (já atualizado).
CREATE OR REPLACE FUNCTION public.search_products(
  p_term  text,
  p_lim   integer DEFAULT 20,
  p_off   integer DEFAULT 0
)
RETURNS TABLE (
  id                uuid,
  nome              text,
  descricao         text,
  preco_venda       numeric,
  preco_promocional numeric,
  unidade_medida    text,
  categoria_nome    text
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, extensions, pg_catalog
AS $$
  SELECT
    p.id,
    p.nome,
    p.descricao,
    p.preco_venda,
    p.preco_promocional,
    p.unidade_medida::text,
    c.nome AS categoria_nome
  FROM public.produtos p
  LEFT JOIN public.categorias c ON c.id = p.categoria_id
  WHERE
    p.disponivel = true
    AND (
      -- Camada 1: similaridade por trigramas — tolerância a erros tipográficos.
      -- A expressão é IDÊNTICA à do índice para garantir index scan.
      similarity(
        public.f_unaccent(lower(p.nome || ' ' || COALESCE(p.descricao, ''))),
        public.f_unaccent(lower(p_term))
      ) >= 0.20
      OR
      -- Camada 2: substring fallback — captura termos curtos e acrônimos.
      public.f_unaccent(lower(p.nome || ' ' || COALESCE(p.descricao, '')))
        LIKE '%' || public.f_unaccent(lower(p_term)) || '%'
    )
  ORDER BY
    similarity(
      public.f_unaccent(lower(p.nome || ' ' || COALESCE(p.descricao, ''))),
      public.f_unaccent(lower(p_term))
    ) DESC,
    p.nome ASC
  LIMIT  GREATEST(1, LEAST(p_lim, 100))
  OFFSET GREATEST(0, p_off);
$$;

COMMENT ON FUNCTION public.search_products(text, integer, integer) IS
'Busca fuzzy de produtos disponíveis por pg_trgm (similarity >= 0.20) com fallback ILIKE. '
'Normaliza acentos (f_unaccent) e caixa (lower) em nome + descrição. '
'Expressão idêntica ao idx_produtos_trgm_busca — garante index scan. '
'SECURITY INVOKER — chamado exclusivamente via service_role pelo endpoint de integração.';

-- ─── 5. GRANTS ────────────────────────────────────────────────────────────────
-- search_products: apenas service_role.
-- O endpoint de integração usa serverSupabaseServiceRole + requireInboundToken.
REVOKE EXECUTE ON FUNCTION public.search_products(text, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.search_products(text, integer, integer) TO service_role;

COMMIT;
