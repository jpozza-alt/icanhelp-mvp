begin;

-- Novo usuário passa a ser somente um usuário autenticado.
-- Não criar tenant nem membership automaticamente no INSERT de auth.users.
drop trigger if exists icanhelp_on_auth_user_created on auth.users;

drop function if exists public.icanhelp_handle_new_auth_user();
drop function if exists public.icanhelp_bootstrap_user_tenant(uuid, text);

-- A criação do primeiro tenant passa a exigir uma ação explícita
-- do próprio usuário autenticado.
create or replace function public.icanhelp_create_initial_tenant(
  p_name text
)
returns table (
  tenant_id uuid,
  role text
)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user_id uuid;
  v_tenant_id uuid;
  v_name text;
begin
  v_user_id := auth.uid();
  v_name := btrim(coalesce(p_name, ''));

  if v_user_id is null then
    raise exception 'user_not_authenticated'
      using errcode = 'P0001';
  end if;

  if char_length(v_name) < 3 or char_length(v_name) > 120 then
    raise exception 'tenant_name_invalid'
      using errcode = 'P0001';
  end if;

  -- Serializa o bootstrap por usuário para impedir duplo clique
  -- ou duas requisições concorrentes criando dois tenants próprios.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_user_id::text, 0)
  );

  if exists (
    select 1
    from public.tenant_memberships tm
    where tm.user_id = v_user_id
      and tm.role = 'owner'
  ) then
    raise exception 'user_already_owns_tenant'
      using errcode = 'P0001';
  end if;

  insert into public.tenants (name)
  values (v_name)
  returning id into v_tenant_id;

  insert into public.tenant_memberships (
    tenant_id,
    user_id,
    role
  )
  values (
    v_tenant_id,
    v_user_id,
    'owner'
  );

  return query
  select
    v_tenant_id,
    'owner'::text;
end;
$function$;

revoke all
on function public.icanhelp_create_initial_tenant(text)
from public;

grant execute
on function public.icanhelp_create_initial_tenant(text)
to authenticated;

commit;