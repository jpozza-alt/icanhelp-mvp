begin;

create extension if not exists pgcrypto;
drop function if exists public.icanhelp_touch_updated_at();

create or replace function public.icanhelp_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();

  if new.updated_by is null then
    new.updated_by := auth.uid();
  end if;

  return new;
end;
$$;

create table if not exists public.tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text null unique,
  created_at timestamptz not null default now(),
  created_by uuid null references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  updated_by uuid null references auth.users(id) on delete set null
);

create table if not exists public.tenant_memberships (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null
    check (role in ('owner', 'admin', 'member')),
  created_at timestamptz not null default now(),
  created_by uuid null references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  updated_by uuid null references auth.users(id) on delete set null,
  constraint tenant_memberships_tenant_user_key unique (tenant_id, user_id)
);

create index if not exists tenants_name_idx
  on public.tenants(name);

alter table public.tenants
  add column if not exists slug text;

create index if not exists tenants_slug_idx
  on public.tenants(slug);
create index if not exists tenant_memberships_tenant_id_idx
  on public.tenant_memberships(tenant_id);

create index if not exists tenant_memberships_user_id_idx
  on public.tenant_memberships(user_id);

create index if not exists tenant_memberships_role_idx
  on public.tenant_memberships(role);
create or replace function public.is_tenant_member(p_tenant uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.tenant_memberships tm
    where tm.tenant_id = p_tenant
      and tm.user_id = auth.uid()
  );
$$;
create or replace function public.is_tenant_admin(p_tenant uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.tenant_memberships tm
    where tm.tenant_id = p_tenant
      and tm.user_id = auth.uid()
      and tm.role in ('owner', 'admin')
  );
$$;

drop trigger if exists tenants_touch_updated_at on public.tenants;
create trigger tenants_touch_updated_at
before update on public.tenants
for each row
execute function public.icanhelp_touch_updated_at();

drop trigger if exists tenant_memberships_touch_updated_at on public.tenant_memberships;
create trigger tenant_memberships_touch_updated_at
before update on public.tenant_memberships
for each row
execute function public.icanhelp_touch_updated_at();

alter table public.tenants enable row level security;
alter table public.tenants force row level security;

alter table public.tenant_memberships enable row level security;
alter table public.tenant_memberships force row level security;

drop policy if exists tenants_select_member on public.tenants;
create policy tenants_select_member
on public.tenants
for select
to authenticated
using (public.is_tenant_member(id));

drop policy if exists tenant_memberships_select_self on public.tenant_memberships;
create policy tenant_memberships_select_self
on public.tenant_memberships
for select
to authenticated
using (user_id = auth.uid());

commit;





