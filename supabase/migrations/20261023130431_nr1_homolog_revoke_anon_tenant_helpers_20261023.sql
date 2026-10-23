DO $preflight$
DECLARE
  v_count integer;
BEGIN
  SELECT count(*) INTO v_count
  FROM pg_proc p
  WHERE p.pronamespace = 'public'::regnamespace
    AND (
      (p.proname = 'icanhelp_nr1_is_tenant_admin' AND pg_get_function_identity_arguments(p.oid) = 'p_tenant_id uuid')
      OR (p.proname = 'icanhelp_nr1_is_tenant_member' AND pg_get_function_identity_arguments(p.oid) = 'p_tenant_id uuid')
      OR (p.proname = 'is_tenant_admin' AND pg_get_function_identity_arguments(p.oid) = 'p_tenant uuid')
      OR (p.proname = 'is_tenant_member' AND pg_get_function_identity_arguments(p.oid) = 'p_tenant uuid')
    )
    AND p.prosecdef
    AND has_function_privilege('anon', p.oid, 'EXECUTE')
    AND has_function_privilege('authenticated', p.oid, 'EXECUTE')
    AND has_function_privilege('service_role', p.oid, 'EXECUTE')
    AND EXISTS (
      SELECT 1 FROM aclexplode(p.proacl) acl
      WHERE acl.grantee = 0 AND acl.privilege_type = 'EXECUTE'
    )
    AND EXISTS (
      SELECT 1 FROM aclexplode(p.proacl) acl
      WHERE acl.grantee = 'anon'::regrole AND acl.privilege_type = 'EXECUTE'
    );

  IF v_count <> 4 THEN
    RAISE EXCEPTION 'tenant_function_grant_preconditions_failed: % of 4', v_count;
  END IF;

  IF (SELECT count(*) FROM pg_policies WHERE schemaname = 'public') <> 146 THEN
    RAISE EXCEPTION 'rls_policy_count_changed_before_permission_hardening';
  END IF;
END
$preflight$;

REVOKE EXECUTE ON FUNCTION public.icanhelp_nr1_is_tenant_admin(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.icanhelp_nr1_is_tenant_member(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_tenant_admin(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_tenant_member(uuid) FROM PUBLIC, anon;