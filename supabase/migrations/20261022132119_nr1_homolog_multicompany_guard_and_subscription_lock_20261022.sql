
DO $preflight$
BEGIN
  IF to_regclass('public.nr1_companies') IS NULL
    OR to_regclass('public.tenant_subscriptions') IS NULL
    OR to_regclass('public.tenant_memberships') IS NULL THEN
    RAISE EXCEPTION 'homol_multi_preflight_tables_missing';
  END IF;
  IF to_regprocedure('public.icanhelp_nr1_create_company(uuid,text,text,text,text,text,text,integer,boolean,boolean,boolean,boolean,boolean,boolean,text)') IS NOT NULL
    OR to_regprocedure('public.icanhelp_nr1_company_write_guard()') IS NOT NULL THEN
    RAISE EXCEPTION 'homol_multi_preflight_function_already_exists';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_policies
    WHERE schemaname = 'public' AND tablename = 'nr1_companies'
      AND policyname = 'nr1_companies_insert_member'
  ) THEN
    RAISE EXCEPTION 'homol_multi_preflight_original_insert_policy_missing';
  END IF;
END
$preflight$;

CREATE FUNCTION public.icanhelp_nr1_company_write_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $fn$
DECLARE
  v_actor uuid := auth.uid();
  v_service_role text := auth.role();
  v_has_other_company boolean;
  v_partner_allowed boolean;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.tenant_id IS DISTINCT FROM OLD.tenant_id THEN
      RAISE EXCEPTION 'nr1_company_tenant_change_forbidden' USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.tenant_id IS NULL THEN
    RAISE EXCEPTION 'nr1_company_create_forbidden' USING ERRCODE = '42501';
  END IF;

  IF v_service_role = 'service_role' OR SESSION_USER = 'postgres' THEN
    RETURN NEW;
  END IF;

  IF v_actor IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.tenant_memberships AS tm
    WHERE tm.tenant_id = NEW.tenant_id
      AND tm.user_id = v_actor
      AND tm.role IN ('owner', 'admin')
  ) THEN
    RAISE EXCEPTION 'nr1_company_create_forbidden' USING ERRCODE = '42501';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(NEW.tenant_id::text, 141901)
  );

  SELECT EXISTS (
    SELECT 1 FROM public.nr1_companies AS nc
    WHERE nc.tenant_id = NEW.tenant_id
  ) INTO v_has_other_company;

  IF v_has_other_company THEN
    SELECT EXISTS (
      SELECT 1
      FROM public.tenant_subscriptions AS ts
      JOIN public.subscription_plans AS sp ON sp.id = ts.subscription_plan_id
      WHERE ts.tenant_id = NEW.tenant_id
        AND ts.status IN ('active', 'trial', 'past_due')
        AND sp.is_active
        AND sp.slug IN ('partner_sst', 'pasini')
        AND EXISTS (
          SELECT 1 FROM public.plan_features pf
          JOIN public.features f ON f.id = pf.feature_id
          WHERE pf.subscription_plan_id = sp.id AND pf.is_enabled AND f.is_active
            AND f.feature_key = 'multi_company_portfolio'
        )
        AND EXISTS (
          SELECT 1 FROM public.plan_features pf
          JOIN public.features f ON f.id = pf.feature_id
          WHERE pf.subscription_plan_id = sp.id AND pf.is_enabled AND f.is_active
            AND f.feature_key = 'partner_mode'
        )
    ) INTO v_partner_allowed;
    IF NOT v_partner_allowed THEN
      RAISE EXCEPTION 'nr1_company_create_forbidden' USING ERRCODE = '42501';
    END IF;
  END IF;

  NEW.created_by := v_actor;
  RETURN NEW;
END
$fn$;

REVOKE ALL ON FUNCTION public.icanhelp_nr1_company_write_guard() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER nr1_companies_guard_tenant_write
BEFORE INSERT OR UPDATE OF tenant_id ON public.nr1_companies
FOR EACH ROW EXECUTE FUNCTION public.icanhelp_nr1_company_write_guard();

CREATE FUNCTION public.icanhelp_nr1_create_company(
  p_tenant_id uuid,
  p_legal_name text,
  p_trade_name text,
  p_cnpj text,
  p_cnae_main text,
  p_company_size text,
  p_risk_grade text,
  p_employee_count integer,
  p_has_cipa boolean,
  p_has_sesmt boolean,
  p_has_public_service boolean,
  p_has_remote_work boolean,
  p_has_third_parties boolean,
  p_has_external_activities boolean,
  p_status text
)
RETURNS SETOF public.nr1_companies
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $rpc$
BEGIN
  IF p_tenant_id IS NULL OR (auth.uid() IS NULL AND auth.role() IS DISTINCT FROM 'service_role') THEN
    RAISE EXCEPTION 'nr1_company_create_forbidden' USING ERRCODE = '42501';
  END IF;
  IF p_legal_name IS NULL OR pg_catalog.length(pg_catalog.btrim(p_legal_name)) < 3 THEN
    RAISE EXCEPTION 'invalid_legal_name' USING ERRCODE = '22023';
  END IF;
  RETURN QUERY
    INSERT INTO public.nr1_companies (
      tenant_id, legal_name, trade_name, cnpj, cnae_main,
      company_size, risk_grade, employee_count, has_cipa,
      has_sesmt, has_public_service, has_remote_work,
      has_third_parties, has_external_activities, status, created_by
    ) VALUES (
      p_tenant_id, pg_catalog.btrim(p_legal_name), p_trade_name, p_cnpj, p_cnae_main,
      p_company_size, p_risk_grade, p_employee_count, COALESCE(p_has_cipa, FALSE),
      COALESCE(p_has_sesmt, FALSE), COALESCE(p_has_public_service, FALSE),
      COALESCE(p_has_remote_work, FALSE), COALESCE(p_has_third_parties, FALSE),
      COALESCE(p_has_external_activities, FALSE), COALESCE(p_status, 'incomplete'), auth.uid()
    ) RETURNING *;
END
$rpc$;
REVOKE ALL ON FUNCTION public.icanhelp_nr1_create_company(
  uuid,text,text,text,text,text,text,integer,boolean,boolean,boolean,
  boolean,boolean,boolean,text
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.icanhelp_nr1_create_company(
  uuid,text,text,text,text,text,text,integer,boolean,boolean,boolean,
  boolean,boolean,boolean,text
) TO authenticated, service_role;

REVOKE INSERT, UPDATE, DELETE, TRUNCATE, TRIGGER
  ON public.tenant_subscriptions FROM PUBLIC, anon, authenticated;
DROP POLICY IF EXISTS tenant_subscriptions_insert_admin ON public.tenant_subscriptions;
DROP POLICY IF EXISTS tenant_subscriptions_update_admin ON public.tenant_subscriptions;
DROP POLICY IF EXISTS tenant_subscriptions_delete_admin ON public.tenant_subscriptions;

REVOKE TRUNCATE, TRIGGER ON public.nr1_companies FROM PUBLIC, anon, authenticated;
