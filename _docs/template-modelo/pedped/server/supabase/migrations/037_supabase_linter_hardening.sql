-- =====================================================================================
-- MIGRATION 037: Supabase Linter Hardening (parte 1)
-- Aplicada em produção (sales_delivery) em 2026-07-04.
-- Resolve:
--   ERROR 0013 rls_disabled_in_public  (spatial_ref_sys)      → via DROP EXTENSION postgis
--   WARN  0014 extension_in_public      (postgis)             → idem
--   WARN  0028/0029 st_estimatedextent  (3 assinaturas, anon+auth) → idem (funções do PostGIS)
--   WARN  0024 rls_policy_always_true   (regras_frete_distancia)   → policy restrita a gerente+
--   WARN  0028/0029 calcular_frete_por_distancia               → SECURITY INVOKER
--   WARN  0028/0029 trigger_archive_orders                     → REVOKE de anon/authenticated
-- =====================================================================================

BEGIN;

-- 1) PostGIS sem uso (nenhuma coluna geometry/geography; distância é Haversine pura).
--    Verificado: nenhum objeto de negócio depende da extensão.
DROP EXTENSION IF EXISTS postgis;

-- 2) regras_frete_distancia: a policy de escrita era FOR ALL USING(true) WITH CHECK(true)
--    para authenticated — qualquer logado (inclusive entregador) reescrevia o frete.
DROP POLICY IF EXISTS "authenticated_write_regras_frete" ON public.regras_frete_distancia;
CREATE POLICY "Manage regras_frete (gerente+)" ON public.regras_frete_distancia
  FOR ALL TO authenticated
  USING     (public.has_role(ARRAY['gerente','administrador','proprietario']::public.role_usuario_enum[]))
  WITH CHECK (public.has_role(ARRAY['gerente','administrador','proprietario']::public.role_usuario_enum[]));

-- 3) calcular_frete_por_distancia: SECURITY DEFINER → SECURITY INVOKER.
--    Lê apenas regras_frete_distancia (leitura pública) → checkout anônimo continua ok.
CREATE OR REPLACE FUNCTION public.calcular_frete_por_distancia(p_distancia_km numeric)
RETURNS numeric
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path TO 'public', 'pg_catalog'
AS $function$
DECLARE
  v_valor numeric;
BEGIN
  SELECT valor_frete INTO v_valor
  FROM public.regras_frete_distancia
  WHERE ativo = true
    AND p_distancia_km >= distancia_min_km
    AND p_distancia_km <  distancia_max_km
  ORDER BY ordem ASC
  LIMIT 1;

  RETURN v_valor;  -- NULL = sem regra; caller usa loja.taxa_entrega_padrao
END;
$function$;

-- 4) trigger_archive_orders: acionada só pelo pg_cron (roda como postgres).
REVOKE EXECUTE ON FUNCTION public.trigger_archive_orders() FROM PUBLIC, anon, authenticated;

COMMIT;

-- NOTA: a policy e a função acima ainda referenciam public.has_role; a migration 038
-- move os helpers RBAC para o schema `private` e repontaa esta policy.
