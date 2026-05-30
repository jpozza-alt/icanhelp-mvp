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

-- Candidate additive migration for Querino & Pasini recruitment contracting fields.
-- Safe to review before applying. No execution performed by this script.

do $$
begin
  if to_regclass('public.pasini_recruitment_requests') is null then
    raise exception 'Table public.pasini_recruitment_requests does not exist';
  end if;
end $$;

alter table public.pasini_recruitment_requests
  add column if not exists benefits_notes text,
  add column if not exists copy_email text,
  add column if not exists systems_tools_equipment text,
  add column if not exists job_description_attachment text,
  add column if not exists recruitment_model text,
  add column if not exists mandatory_declarations jsonb not null default '[]'::jsonb,
  add column if not exists final_confirmation boolean not null default false,
  add column if not exists acceptance_email text,
  add column if not exists acceptance_date date,
  add column if not exists govbr_signature_status text not null default 'pending_pdf_generation',
  add column if not exists signed_proposal_file text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'pasini_recruitment_requests_selected_package_check'
  ) then
    alter table public.pasini_recruitment_requests
      add constraint pasini_recruitment_requests_selected_package_check
      check (
        selected_package is null
        or selected_package in ('essential', 'strategic', 'premium')
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'pasini_recruitment_requests_govbr_signature_status_check'
  ) then
    alter table public.pasini_recruitment_requests
      add constraint pasini_recruitment_requests_govbr_signature_status_check
      check (
        govbr_signature_status in (
          'pending_pdf_generation',
          'pending_govbr_signature',
          'signed_received',
          'signature_rejected',
          'not_applicable'
        )
      );
  end if;
end $$;

comment on column public.pasini_recruitment_requests.govbr_signature_status is
  'Status operacional da proposta ou ordem de servico para assinatura gov.br.';

comment on column public.pasini_recruitment_requests.signed_proposal_file is
  'Referencia futura ao PDF assinado pelo gov.br. Nao usar como arquivo publico.';

-- Candidate additive migration for vacancy information status.
-- Safe to review before applying. No execution performed by this script.

do $$
begin
  if to_regclass('public.pasini_recruitment_requests') is null then
    raise exception 'Table public.pasini_recruitment_requests does not exist';
  end if;
end $$;

alter table public.pasini_recruitment_requests
  add column if not exists vacancy_information_status text not null default 'partial';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'pasini_recruitment_requests_vacancy_information_status_check'
  ) then
    alter table public.pasini_recruitment_requests
      add constraint pasini_recruitment_requests_vacancy_information_status_check
      check (
        vacancy_information_status in ('complete', 'partial', 'none')
      );
  end if;
end $$;

comment on column public.pasini_recruitment_requests.vacancy_information_status is
  'Indica se a empresa ja possui informacoes completas, parciais ou nenhuma informacao organizada da vaga.';

-- Candidate additive migration for package recommendation logic.
-- Safe to review before applying. No execution performed by this script.

do $$
begin
  if to_regclass('public.pasini_recruitment_requests') is null then
    raise exception 'Table public.pasini_recruitment_requests does not exist';
  end if;
end $$;

alter table public.pasini_recruitment_requests
  add column if not exists recommended_package text,
  add column if not exists package_recommendation_reason text,
  add column if not exists vacancy_complexity_level text not null default 'standard',
  add column if not exists package_override_reason text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'pasini_recruitment_requests_recommended_package_check'
  ) then
    alter table public.pasini_recruitment_requests
      add constraint pasini_recruitment_requests_recommended_package_check
      check (
        recommended_package is null
        or recommended_package in ('essential', 'strategic', 'premium')
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'pasini_recruitment_requests_vacancy_complexity_level_check'
  ) then
    alter table public.pasini_recruitment_requests
      add constraint pasini_recruitment_requests_vacancy_complexity_level_check
      check (
        vacancy_complexity_level in ('standard', 'strategic', 'unknown')
      );
  end if;
end $$;

comment on column public.pasini_recruitment_requests.recommended_package is
  'Plano sugerido automaticamente conforme situacao das informacoes da vaga e complexidade declarada.';

comment on column public.pasini_recruitment_requests.package_recommendation_reason is
  'Motivo textual da recomendacao automatica de plano.';

comment on column public.pasini_recruitment_requests.vacancy_complexity_level is
  'Indica se a vaga foi declarada como padrao, estrategica ou incerta.';

comment on column public.pasini_recruitment_requests.package_override_reason is
  'Motivo informado quando o plano final escolhido for diferente do plano sugerido.';

-- Candidate additive migration for analysis request flow.
-- Safe to review before applying. No execution performed by this script.

do $$
begin
  if to_regclass('public.pasini_recruitment_requests') is null then
    raise exception 'Table public.pasini_recruitment_requests does not exist';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'pasini_recruitment_requests'
      and column_name = 'status'
  ) then
    raise exception 'Column status does not exist on public.pasini_recruitment_requests';
  end if;
end $$;

alter table public.pasini_recruitment_requests
  alter column status set default 'pending_consultancy_review';

comment on column public.pasini_recruitment_requests.status is
  'Fluxo comercial: pending_consultancy_review, proposal_ready, pending_govbr_signature, contracted_signed, canceled.';

comment on column public.pasini_recruitment_requests.govbr_signature_status is
  'Status gov.br. No envio inicial fica not_applicable, pois ainda nao existe proposta ou ordem de servico para assinatura.';

comment on column public.pasini_recruitment_requests.mandatory_declarations is
  'No formulario publico deve registrar apenas o aceite unico de autorizacao para analise. Declaracoes completas ficam na proposta ou ordem de servico.';

