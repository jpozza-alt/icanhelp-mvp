
DO $guard$
DECLARE
  v_before text;
  v_after text;
  v_old text := 'IF v_service_role = ''service_role'' OR SESSION_USER = ''postgres'' THEN';
  v_new text := 'IF v_service_role = ''service_role'' OR (SESSION_USER = ''postgres'' AND v_service_role IS NULL) THEN';
BEGIN
  SELECT pg_catalog.pg_get_functiondef('public.icanhelp_nr1_company_write_guard()'::pg_catalog.regprocedure)
    INTO v_before;
  IF v_before IS NULL OR pg_catalog.strpos(v_before, v_old) = 0 THEN
    RAISE EXCEPTION 'guard_expected_definition_mismatch';
  END IF;
  v_after := pg_catalog.replace(v_before, v_old, v_new);
  EXECUTE v_after;
END
$guard$;