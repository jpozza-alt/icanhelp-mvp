begin;

create table if not exists public.nr1_assessments (
    id uuid primary key default gen_random_uuid(),
    tenant_id uuid not null references public.tenants(id) on delete restrict,

    establishment_name text not null,
    unit_name text null,
    sector_name text null,
    activity_name text not null,
    process_description text null,
    environment_description text null,

    risk_category text not null,
    risk_type text null,
    hazard_title text not null,
    hazard_description text not null,
    source_or_circumstance text not null,
    external_hazard_flag boolean not null default false,

    exposed_group_description text not null,
    workers_count_estimate integer null,
    exposure_characterization text null,
    routine_flag boolean not null default true,
    change_related_flag boolean not null default false,

    possible_injuries_or_health_effects text not null,

    existing_prevention_measures text null,
    prevention_effectiveness_notes text null,

    severity_level integer not null,
    probability_level integer not null,
    risk_level text not null,
    risk_priority text not null,
    immediate_action_required_flag boolean not null default false,
    action_plan_needed_flag boolean not null default false,

    recommended_action_summary text null,
    monitoring_notes text null,

    status text not null default 'draft',
    version integer not null default 1,

    created_at timestamptz not null default now(),
    created_by uuid null references auth.users(id) on delete set null,
    updated_at timestamptz not null default now(),
    updated_by uuid null references auth.users(id) on delete set null,
    deleted_at timestamptz null,
    deleted_by uuid null references auth.users(id) on delete set null,

    constraint nr1_assessments_establishment_name_chk check (char_length(trim(establishment_name)) >= 3),
    constraint nr1_assessments_activity_name_chk check (char_length(trim(activity_name)) >= 3),
    constraint nr1_assessments_risk_category_chk check (
        risk_category in (
            'physical',
            'chemical',
            'biological',
            'ergonomic',
            'psychosocial_related_to_work',
            'accident'
        )
    ),
    constraint nr1_assessments_hazard_title_chk check (char_length(trim(hazard_title)) >= 3),
    constraint nr1_assessments_hazard_description_chk check (char_length(trim(hazard_description)) >= 10),
    constraint nr1_assessments_source_or_circumstance_chk check (char_length(trim(source_or_circumstance)) >= 5),
    constraint nr1_assessments_exposed_group_description_chk check (char_length(trim(exposed_group_description)) >= 5),
    constraint nr1_assessments_possible_effects_chk check (char_length(trim(possible_injuries_or_health_effects)) >= 5),
    constraint nr1_assessments_workers_count_estimate_chk check (
        workers_count_estimate is null or workers_count_estimate > 0
    ),
    constraint nr1_assessments_severity_level_chk check (severity_level between 1 and 5),
    constraint nr1_assessments_probability_level_chk check (probability_level between 1 and 5),
    constraint nr1_assessments_risk_level_chk check (
        risk_level in ('very_high', 'high', 'medium', 'low')
    ),
    constraint nr1_assessments_risk_priority_chk check (
        risk_priority in ('very_high', 'high', 'medium', 'low')
    ),
    constraint nr1_assessments_status_chk check (
        status in ('draft', 'reviewed', 'approved', 'archived')
    ),
    constraint nr1_assessments_version_chk check (version > 0),
    constraint nr1_assessments_deleted_pair_chk check (
        (deleted_at is null and deleted_by is null)
        or
        (deleted_at is not null and deleted_by is not null)
    ),
    constraint nr1_assessments_action_plan_flag_chk check (
        case
            when risk_priority in ('medium', 'high', 'very_high') then action_plan_needed_flag = true
            else true
        end
    ),
    constraint nr1_assessments_immediate_flag_chk check (
        case
            when risk_priority = 'very_high' then immediate_action_required_flag = true
            else true
        end
    )
);

create index if not exists idx_nr1_assessments_tenant_id
    on public.nr1_assessments (tenant_id);

create index if not exists idx_nr1_assessments_tenant_status
    on public.nr1_assessments (tenant_id, status);

create index if not exists idx_nr1_assessments_tenant_risk_category
    on public.nr1_assessments (tenant_id, risk_category);

create index if not exists idx_nr1_assessments_tenant_risk_priority
    on public.nr1_assessments (tenant_id, risk_priority);

create index if not exists idx_nr1_assessments_tenant_activity_name
    on public.nr1_assessments (tenant_id, activity_name);

create index if not exists idx_nr1_assessments_deleted_at
    on public.nr1_assessments (deleted_at);

create or replace function public.nr1_assessments_set_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

drop trigger if exists trg_nr1_assessments_set_updated_at on public.nr1_assessments;

create trigger trg_nr1_assessments_set_updated_at
before update on public.nr1_assessments
for each row
execute function public.nr1_assessments_set_updated_at();

alter table public.nr1_assessments enable row level security;
alter table public.nr1_assessments force row level security;

revoke all on public.nr1_assessments from anon;
grant select, insert, update on public.nr1_assessments to authenticated;

drop policy if exists nr1_assessments_select_member on public.nr1_assessments;
create policy nr1_assessments_select_member
on public.nr1_assessments
for select
to authenticated
using (public.is_tenant_member(tenant_id));

drop policy if exists nr1_assessments_insert_member on public.nr1_assessments;
create policy nr1_assessments_insert_member
on public.nr1_assessments
for insert
to authenticated
with check (public.is_tenant_member(tenant_id));

drop policy if exists nr1_assessments_update_member on public.nr1_assessments;
create policy nr1_assessments_update_member
on public.nr1_assessments
for update
to authenticated
using (public.is_tenant_member(tenant_id))
with check (public.is_tenant_member(tenant_id));

commit;
