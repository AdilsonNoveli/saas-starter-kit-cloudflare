-- =====================================================================================
-- MIGRATION: Função de validação de raio de entrega (Haversine pura em SQL)
-- Versão: 026
-- Descrição: Cria a função is_within_delivery_radius que calcula a distância
--            geodésica entre as coordenadas do cliente e da loja usando a fórmula
--            de Haversine, sem dependência de PostGIS.
--            Grantada ao role anon para ser chamada via serverSupabaseClient
--            a partir do catálogo público (sem autenticação Supabase Auth).
-- =====================================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.is_within_delivery_radius(clat numeric, clng numeric)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT COALESCE(
    (
      SELECT
        (
          6371 * 2 * ASIN(SQRT(
            POWER(SIN((RADIANS(clat::double precision) - RADIANS(l.latitude_origem::double precision)) / 2), 2) +
            COS(RADIANS(l.latitude_origem::double precision)) *
            COS(RADIANS(clat::double precision)) *
            POWER(SIN((RADIANS(clng::double precision) - RADIANS(l.longitude_origem::double precision)) / 2), 2)
          ))
        ) <= l.raio_atendimento_km::double precision
      FROM public.loja l
      WHERE l.latitude_origem IS NOT NULL
        AND l.longitude_origem IS NOT NULL
        AND l.raio_atendimento_km IS NOT NULL
      LIMIT 1
    ),
    -- Loja sem coordenadas configuradas: permite entrega para não bloquear
    -- instalações recém-configuradas que ainda não geocodificaram o endereço.
    true
  );
$$;

COMMENT ON FUNCTION public.is_within_delivery_radius(numeric, numeric) IS
'Retorna true se as coordenadas (clat, clng) estão dentro do raio de atendimento
configurado na loja. Usa Haversine pura (sem PostGIS). Retorna true quando a loja
não tem coordenadas configuradas (instalação inicial).';

REVOKE EXECUTE ON FUNCTION public.is_within_delivery_radius(numeric, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_within_delivery_radius(numeric, numeric) TO anon, authenticated, service_role;

COMMIT;
