DO $preflight$
DECLARE
  v_count integer;
  v_using text;
  v_check text;
BEGIN
  SELECT COUNT(*), MAX(qual), MAX(with_check)
    INTO v_count, v_using, v_check
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'nr1_companies'
    AND policyname = 'nr1_companies_update_member'
    AND cmd = 'UPDATE';

  IF v_count <> 1
     OR v_using IS DISTINCT FROM 'icanhelp_nr1_is_tenant_member(tenant_id)'
     OR v_check IS DISTINCT FROM 'icanhelp_nr1_is_tenant_member(tenant_id)' THEN
    RAISE EXCEPTION 'nr1_companies_update_precondition_failed';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_proc
    WHERE oid = to_regprocedure('public.icanhelp_nr1_is_tenant_admin(uuid)')
  ) THEN
    RAISE EXCEPTION 'nr1_admin_predicate_absent';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_class
    WHERE oid = 'public.nr1_companies'::regclass
      AND relrowsecurity
      AND relforcerowsecurity
  ) THEN
    RAISE EXCEPTION 'nr1_companies_rls_not_enforced';
  END IF;
END
$preflight$;

ALTER POLICY nr1_companies_update_member
  ON public.nr1_companies
  USING (public.icanhelp_nr1_is_tenant_admin(tenant_id))
  WITH CHECK (public.icanhelp_nr1_is_tenant_admin(tenant_id));