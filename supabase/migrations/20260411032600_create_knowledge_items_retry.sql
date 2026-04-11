-- Retry migration generated because version 20260411 is marked as applied in remote history
-- but public.knowledge_items was confirmed absent in remote inspection.
-- Source migration: 20260411_create_knowledge_items.sql
begin;

create extension if not exists pgcrypto;

create table if not exists public.knowledge_items (
    id uuid primary key default gen_random_uuid(),
    tenant_id uuid not null,
    domain text not null,
    category text not null,
    title text not null,
    summary text null,
    body text not null,
    foundation_type text null,
    foundation_reference text null,
    status text not null default 'draft',
    version integer not null default 1,
    created_at timestamptz not null default now(),
    created_by uuid null,
    updated_at timestamptz not null default now(),
    updated_by uuid null,
    deleted_at timestamptz null,
    deleted_by uuid null,
    constraint fk_knowledge_items_tenant
        foreign key (tenant_id)
        references public.tenants(id)
        on delete restrict,
    constraint ck_knowledge_items_domain
        check (domain in ('organizational','governmental')),
    constraint ck_knowledge_items_status
        check (status in ('draft','approved','archived')),
    constraint ck_knowledge_items_version
        check (version >= 1)
);

create index if not exists idx_knowledge_items_tenant_id
    on public.knowledge_items (tenant_id);

create index if not exists idx_knowledge_items_tenant_domain
    on public.knowledge_items (tenant_id, domain);

create index if not exists idx_knowledge_items_tenant_status
    on public.knowledge_items (tenant_id, status);

create index if not exists idx_knowledge_items_tenant_category
    on public.knowledge_items (tenant_id, category);

create or replace function public.set_knowledge_items_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

drop trigger if exists trg_knowledge_items_set_updated_at on public.knowledge_items;

create trigger trg_knowledge_items_set_updated_at
before update on public.knowledge_items
for each row
execute function public.set_knowledge_items_updated_at();

alter table public.knowledge_items enable row level security;
alter table public.knowledge_items force row level security;

drop policy if exists "knowledge_items_select_by_membership" on public.knowledge_items;
create policy "knowledge_items_select_by_membership"
on public.knowledge_items
for select
to authenticated
using (
    exists (
        select 1
        from public.tenant_memberships tm
        where tm.tenant_id = knowledge_items.tenant_id
          and tm.user_id = auth.uid()
    )
);

drop policy if exists "knowledge_items_insert_by_membership" on public.knowledge_items;
create policy "knowledge_items_insert_by_membership"
on public.knowledge_items
for insert
to authenticated
with check (
    exists (
        select 1
        from public.tenant_memberships tm
        where tm.tenant_id = knowledge_items.tenant_id
          and tm.user_id = auth.uid()
          and tm.role in ('owner','admin','member')
    )
);

drop policy if exists "knowledge_items_update_by_membership" on public.knowledge_items;
create policy "knowledge_items_update_by_membership"
on public.knowledge_items
for update
to authenticated
using (
    exists (
        select 1
        from public.tenant_memberships tm
        where tm.tenant_id = knowledge_items.tenant_id
          and tm.user_id = auth.uid()
          and tm.role in ('owner','admin')
    )
)
with check (
    exists (
        select 1
        from public.tenant_memberships tm
        where tm.tenant_id = knowledge_items.tenant_id
          and tm.user_id = auth.uid()
          and tm.role in ('owner','admin')
    )
);

drop policy if exists "knowledge_items_delete_by_membership" on public.knowledge_items;
create policy "knowledge_items_delete_by_membership"
on public.knowledge_items
for delete
to authenticated
using (
    exists (
        select 1
        from public.tenant_memberships tm
        where tm.tenant_id = knowledge_items.tenant_id
          and tm.user_id = auth.uid()
          and tm.role in ('owner','admin')
    )
);

commit;

