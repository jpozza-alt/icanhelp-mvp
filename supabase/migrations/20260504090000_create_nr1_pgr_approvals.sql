-- Action 541
-- NR1 PGR professional approval contract.
-- This table stores the professional validation act over a formal PGR document version.
-- It does not replace public.nr1_document_versions.

create table if not exists public.nr1_pgr_approvals (
    id uuid primary key default gen_random_uuid(),
    tenant_id uuid not null references public.tenants(id) on delete cascade,
    establishment_id uuid not null,
    document_version_id uuid not null references public.nr1_document_versions(id) on delete cascade,
    approval_status text not null default 'draft',
    professional_name text not null,
    professional_role text null,
    professional_council text null,
    professional_registration text null,
    professional_state text null,
    approval_statement text null,
    approved_at timestamptz null,
    approved_by uuid null references auth.users(id),
    created_at timestamptz not null default now(),
    created_by uuid null references auth.users(id),
    updated_at timestamptz not null default now(),
    updated_by uuid null references auth.users(id),
    revoked_at timestamptz null,
    revoked_by uuid null references auth.users(id),
    revocation_reason text null,
    source_snapshot_json jsonb not null default '{}'::jsonb,
    constraint nr1_pgr_approvals_status_check check (
        approval_status in ('draft', 'approved', 'revoked', 'superseded')
    )
);

create index if not exists idx_nr1_pgr_approvals_tenant
    on public.nr1_pgr_approvals (tenant_id);

create index if not exists idx_nr1_pgr_approvals_establishment
    on public.nr1_pgr_approvals (tenant_id, establishment_id);

create index if not exists idx_nr1_pgr_approvals_document_version
    on public.nr1_pgr_approvals (document_version_id);

create index if not exists idx_nr1_pgr_approvals_status
    on public.nr1_pgr_approvals (tenant_id, establishment_id, approval_status);

create or replace function public.nr1_pgr_approvals_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

drop trigger if exists trg_nr1_pgr_approvals_touch_updated_at on public.nr1_pgr_approvals;

create trigger trg_nr1_pgr_approvals_touch_updated_at
before update on public.nr1_pgr_approvals
for each row
execute function public.nr1_pgr_approvals_touch_updated_at();

create or replace function public.nr1_pgr_approvals_validate_document_version()
returns trigger
language plpgsql
as $$
begin
    if not exists (
        select 1
        from public.nr1_document_versions dv
        where dv.id = new.document_version_id
          and dv.tenant_id = new.tenant_id
          and dv.establishment_id = new.establishment_id
    ) then
        raise exception 'document_version_id does not belong to the same tenant_id and establishment_id';
    end if;

    return new;
end;
$$;

drop trigger if exists trg_nr1_pgr_approvals_validate_document_version on public.nr1_pgr_approvals;

create trigger trg_nr1_pgr_approvals_validate_document_version
before insert or update on public.nr1_pgr_approvals
for each row
execute function public.nr1_pgr_approvals_validate_document_version();

alter table public.nr1_pgr_approvals enable row level security;

drop policy if exists nr1_pgr_approvals_select_policy on public.nr1_pgr_approvals;
drop policy if exists nr1_pgr_approvals_insert_policy on public.nr1_pgr_approvals;
drop policy if exists nr1_pgr_approvals_update_policy on public.nr1_pgr_approvals;

create policy nr1_pgr_approvals_select_policy
on public.nr1_pgr_approvals
for select
to authenticated
using (
    exists (
        select 1
        from public.tenant_memberships tm
        where tm.tenant_id = nr1_pgr_approvals.tenant_id
          and tm.user_id = auth.uid()
    )
);

create policy nr1_pgr_approvals_insert_policy
on public.nr1_pgr_approvals
for insert
to authenticated
with check (
    exists (
        select 1
        from public.tenant_memberships tm
        where tm.tenant_id = nr1_pgr_approvals.tenant_id
          and tm.user_id = auth.uid()
    )
);

create policy nr1_pgr_approvals_update_policy
on public.nr1_pgr_approvals
for update
to authenticated
using (
    exists (
        select 1
        from public.tenant_memberships tm
        where tm.tenant_id = nr1_pgr_approvals.tenant_id
          and tm.user_id = auth.uid()
    )
)
with check (
    exists (
        select 1
        from public.tenant_memberships tm
        where tm.tenant_id = nr1_pgr_approvals.tenant_id
          and tm.user_id = auth.uid()
    )
);

comment on table public.nr1_pgr_approvals is
'Professional approval and validation act over a formal NR1 PGR document version.';
