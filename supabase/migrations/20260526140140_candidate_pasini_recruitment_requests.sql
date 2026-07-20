-- Candidate migration only.
-- Purpose: public landing form for Pasini recruitment and selection requests.
-- This file is NOT applied by this script.
-- Review before applying to Supabase.

create table if not exists public.pasini_recruitment_requests (
    id uuid primary key default gen_random_uuid(),

    tenant_id uuid not null references public.tenants(id) on delete restrict,

    source text not null default 'public_landing',
    status text not null default 'new',

    company_legal_name text,
    company_trade_name text,
    company_cnpj text,
    company_address text,

    requester_name text not null,
    requester_role_title text,
    requester_cpf text,
    requester_email text not null,
    requester_phone text,

    job_title text not null,
    department_name text,
    position_count integer not null default 1,
    hiring_reason text,
    employment_type text,
    work_model text,
    work_schedule text,
    salary_range text,
    benefits text,

    main_activities text,
    required_experience text,
    required_education text,
    technical_skills text,
    behavioral_profile text,
    elimination_criteria text,
    desirable_criteria text,

    has_job_description boolean not null default false,
    additional_services text,
    selected_package text,
    approved_price numeric(12,2),
    payment_terms text,

    lgpd_acceptance boolean not null default false,
    terms_acceptance boolean not null default false,
    acceptance_name text,
    acceptance_cpf text,
    acceptance_role_title text,
    accepted_at timestamptz,

    internal_notes text,
    payload_json jsonb not null default '{}'::jsonb,

    created_at timestamptz not null default now(),
    created_by uuid,
    updated_at timestamptz not null default now(),
    updated_by uuid,
    deleted_at timestamptz,
    deleted_by uuid,

    constraint pasini_recruitment_requests_status_check
        check (status in ('new','in_review','contacted','proposal_sent','hired','cancelled','archived')),

    constraint pasini_recruitment_requests_acceptance_check
        check (
            (lgpd_acceptance = false and terms_acceptance = false and accepted_at is null)
            or
            (lgpd_acceptance = true and terms_acceptance = true and accepted_at is not null)
        ),

    constraint pasini_recruitment_requests_position_count_check
        check (position_count > 0)
);

create index if not exists idx_pasini_recruitment_requests_tenant_id
    on public.pasini_recruitment_requests(tenant_id);

create index if not exists idx_pasini_recruitment_requests_status
    on public.pasini_recruitment_requests(status);

create index if not exists idx_pasini_recruitment_requests_created_at
    on public.pasini_recruitment_requests(created_at desc);

create index if not exists idx_pasini_recruitment_requests_deleted_at
    on public.pasini_recruitment_requests(deleted_at);

alter table public.pasini_recruitment_requests enable row level security;
alter table public.pasini_recruitment_requests force row level security;

drop policy if exists pasini_recruitment_requests_select_member
    on public.pasini_recruitment_requests;

create policy pasini_recruitment_requests_select_member
    on public.pasini_recruitment_requests
    for select
    to authenticated
    using (
        deleted_at is null
        and exists (
            select 1
            from public.tenant_memberships tm
            where tm.tenant_id = pasini_recruitment_requests.tenant_id
              and tm.user_id = auth.uid()
        )
    );

drop policy if exists pasini_recruitment_requests_insert_member
    on public.pasini_recruitment_requests;

create policy pasini_recruitment_requests_insert_member
    on public.pasini_recruitment_requests
    for insert
    to authenticated
    with check (
        exists (
            select 1
            from public.tenant_memberships tm
            where tm.tenant_id = pasini_recruitment_requests.tenant_id
              and tm.user_id = auth.uid()
        )
    );

drop policy if exists pasini_recruitment_requests_update_admin
    on public.pasini_recruitment_requests;

create policy pasini_recruitment_requests_update_admin
    on public.pasini_recruitment_requests
    for update
    to authenticated
    using (
        exists (
            select 1
            from public.tenant_memberships tm
            where tm.tenant_id = pasini_recruitment_requests.tenant_id
              and tm.user_id = auth.uid()
              and tm.role in ('owner','admin')
        )
    )
    with check (
        exists (
            select 1
            from public.tenant_memberships tm
            where tm.tenant_id = pasini_recruitment_requests.tenant_id
              and tm.user_id = auth.uid()
              and tm.role in ('owner','admin')
        )
    );

comment on table public.pasini_recruitment_requests is
'Candidate table for Pasini public recruitment and selection landing form. Public form should submit through a server API route. Do not expose privileged database keys on client.';

comment on column public.pasini_recruitment_requests.payload_json is
'Raw normalized payload backup for fields not yet modeled.';

