-- Tabela de Tickets (Entidade Central)
create table if not exists public.tickets (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  title text not null,
  description text,
  status text not null default 'open',
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Índices
create index if not exists tickets_tenant_id_idx on public.tickets (tenant_id);
create index if not exists tickets_status_idx on public.tickets (status);

-- RLS
alter table public.tickets enable row level security;

-- FAIL-CLOSED: sem políticas = sem acesso

-- SELECT: só vê tickets do seu tenant
create policy tickets_select_by_tenant
on public.tickets
for select
to authenticated
using (
  tenant_id = (
    select tm.tenant_id
    from public.tenant_memberships tm
    where tm.user_id = auth.uid()
    limit 1
  )
);

-- INSERT: só cria ticket no próprio tenant e como autor
create policy tickets_insert_by_tenant
on public.tickets
for insert
to authenticated
with check (
  tenant_id = (
    select tm.tenant_id
    from public.tenant_memberships tm
    where tm.user_id = auth.uid()
    limit 1
  )
  and created_by = auth.uid()
);

-- UPDATE: só atualiza ticket do próprio tenant
create policy tickets_update_by_tenant
on public.tickets
for update
to authenticated
using (
  tenant_id = (
    select tm.tenant_id
    from public.tenant_memberships tm
    where tm.user_id = auth.uid()
    limit 1
  )
)
with check (
  tenant_id = (
    select tm.tenant_id
    from public.tenant_memberships tm
    where tm.user_id = auth.uid()
    limit 1
  )
);

-- DELETE: opcional (mantido restritivo)
create policy tickets_delete_by_tenant
on public.tickets
for delete
to authenticated
using (
  tenant_id = (
    select tm.tenant_id
    from public.tenant_memberships tm
    where tm.user_id = auth.uid()
    limit 1
  )
);