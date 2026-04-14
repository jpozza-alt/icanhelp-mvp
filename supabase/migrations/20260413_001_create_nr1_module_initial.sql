begin;

create extension if not exists pgcrypto;

create or replace function public.icanhelp_nr1_touch_updated_at()
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

create or replace function public.icanhelp_nr1_is_tenant_member(p_tenant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.tenant_memberships tm
    where tm.tenant_id = p_tenant_id
      and tm.user_id = auth.uid()
  );
$$;

create or replace function public.icanhelp_nr1_is_tenant_admin(p_tenant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.tenant_memberships tm
    where tm.tenant_id = p_tenant_id
      and tm.user_id = auth.uid()
      and tm.role in ('owner', 'admin')
  );
$$;

create table if not exists public.nr1_module_sessions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  establishment_id uuid,
  current_step text,
  progress_percent numeric(5,2) not null default 0,
  pending_count integer not null default 0,
  current_status text not null default 'not_started'
    check (current_status in ('not_started', 'in_progress', 'completed', 'review_pending')),
  last_saved_at timestamptz,
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  updated_by uuid default auth.uid() references auth.users(id) on delete set null,
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id) on delete set null
);

create table if not exists public.nr1_companies (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  legal_name text not null,
  trade_name text,
  cnpj text,
  cnae_main text,
  company_size text,
  risk_grade text,
  employee_count integer,
  has_cipa boolean not null default false,
  has_sesmt boolean not null default false,
  has_public_service boolean not null default false,
  has_remote_work boolean not null default false,
  has_third_parties boolean not null default false,
  has_external_activities boolean not null default false,
  status text not null default 'incomplete'
    check (status in ('incomplete', 'completed', 'outdated')),
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  updated_by uuid default auth.uid() references auth.users(id) on delete set null,
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id) on delete set null
);

create table if not exists public.nr1_company_contacts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  company_id uuid not null references public.nr1_companies(id) on delete cascade,
  contact_type text not null
    check (contact_type in ('module_owner', 'sst_reference', 'hr_reference', 'external_consultant')),
  name text not null,
  role_title text,
  email text,
  phone text,
  is_primary boolean not null default false,
  status text not null default 'active'
    check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  updated_by uuid default auth.uid() references auth.users(id) on delete set null,
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id) on delete set null
);

create table if not exists public.nr1_establishments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  company_id uuid not null references public.nr1_companies(id) on delete cascade,
  name text not null,
  establishment_type text,
  cnpj_unit text,
  cep text,
  address text,
  number text,
  complement text,
  district text,
  city text,
  state text,
  employee_count integer,
  has_third_parties boolean not null default false,
  has_external_activities boolean not null default false,
  notes text,
  status text not null default 'active'
    check (status in ('draft', 'active', 'archived')),
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  updated_by uuid default auth.uid() references auth.users(id) on delete set null,
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id) on delete set null
);

create table if not exists public.nr1_departments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  establishment_id uuid not null references public.nr1_establishments(id) on delete cascade,
  name text not null,
  description text,
  employee_count integer,
  shift_pattern text,
  has_direct_leadership boolean,
  has_public_contact boolean,
  has_deadline_pressure boolean,
  has_repetitive_work boolean,
  has_prolonged_sitting boolean,
  has_relevant_physical_effort boolean,
  has_frequent_displacement boolean,
  notes text,
  status text not null default 'active'
    check (status in ('draft', 'active', 'archived')),
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  updated_by uuid default auth.uid() references auth.users(id) on delete set null,
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id) on delete set null
);

create table if not exists public.nr1_activities (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  establishment_id uuid not null references public.nr1_establishments(id) on delete cascade,
  department_id uuid not null references public.nr1_departments(id) on delete cascade,
  name text not null,
  real_activity_description text,
  frequency text,
  exposed_worker_count integer,
  execution_location text,
  uses_machine boolean not null default false,
  uses_chemical boolean not null default false,
  has_public_contact boolean not null default false,
  has_third_party_interaction boolean not null default false,
  notes text,
  status text not null default 'draft'
    check (status in ('draft', 'ready_for_diagnosis', 'diagnosed', 'review_pending')),
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  updated_by uuid default auth.uid() references auth.users(id) on delete set null,
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id) on delete set null
);

create table if not exists public.nr1_diagnosis_sessions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  establishment_id uuid not null references public.nr1_establishments(id) on delete cascade,
  department_id uuid not null references public.nr1_departments(id) on delete cascade,
  activity_id uuid not null references public.nr1_activities(id) on delete cascade,
  current_stage text,
  overall_status text not null default 'not_started'
    check (overall_status in ('not_started', 'in_progress', 'completed', 'approved', 'review_pending')),
  progress_percent numeric(5,2) not null default 0,
  started_at timestamptz,
  last_saved_at timestamptz,
  completed_at timestamptz,
  completed_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  approved_by uuid references auth.users(id) on delete set null,
  reopened_at timestamptz,
  reopened_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  updated_by uuid default auth.uid() references auth.users(id) on delete set null,
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id) on delete set null
);

create unique index if not exists nr1_diagnosis_sessions_one_open_per_activity_idx
  on public.nr1_diagnosis_sessions(activity_id)
  where deleted_at is null
    and overall_status in ('not_started', 'in_progress', 'review_pending');

create table if not exists public.nr1_diagnosis_context (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  diagnosis_session_id uuid not null unique references public.nr1_diagnosis_sessions(id) on delete cascade,
  work_description text,
  exposed_people_count integer,
  work_routine_type text,
  process_changes_frequency text,
  has_external_work boolean,
  has_multi_company_interaction boolean,
  incident_history text,
  notes text,
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  updated_by uuid default auth.uid() references auth.users(id) on delete set null
);

create table if not exists public.nr1_diagnosis_fqb (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  diagnosis_session_id uuid not null unique references public.nr1_diagnosis_sessions(id) on delete cascade,
  has_noise boolean,
  has_heat_or_cold boolean,
  has_vibration boolean,
  has_dust_fume_gas_vapor_mist boolean,
  has_chemical_contact boolean,
  has_biological_agent boolean,
  has_environmental_monitoring boolean,
  has_existing_control boolean,
  notes text,
  details_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  updated_by uuid default auth.uid() references auth.users(id) on delete set null
);

create table if not exists public.nr1_diagnosis_accidents (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  diagnosis_session_id uuid not null unique references public.nr1_diagnosis_sessions(id) on delete cascade,
  has_same_level_fall boolean,
  has_height_fall boolean,
  has_electricity boolean,
  has_moving_parts_machine boolean,
  has_vehicle_flow boolean,
  has_hot_surfaces boolean,
  has_fire_explosion boolean,
  has_sharps boolean,
  has_confined_space boolean,
  has_obvious_risk boolean,
  obvious_risk_description text,
  immediate_measure text,
  immediate_responsible text,
  immediate_date date,
  notes text,
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  updated_by uuid default auth.uid() references auth.users(id) on delete set null,
  constraint nr1_diagnosis_accidents_obvious_risk_chk
    check (
      has_obvious_risk is distinct from true
      or (
        coalesce(length(trim(obvious_risk_description)), 0) > 0
        and coalesce(length(trim(immediate_measure)), 0) > 0
      )
    )
);

create table if not exists public.nr1_diagnosis_ergonomics (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  diagnosis_session_id uuid not null unique references public.nr1_diagnosis_sessions(id) on delete cascade,
  has_prolonged_sitting boolean,
  has_prolonged_standing boolean,
  has_forced_posture boolean,
  has_repetitive_movements boolean,
  has_manual_handling boolean,
  furniture_adequacy text,
  lighting_adequacy text,
  thermal_discomfort boolean,
  acoustic_discomfort boolean,
  has_existing_aep boolean,
  notes text,
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  updated_by uuid default auth.uid() references auth.users(id) on delete set null
);

create table if not exists public.nr1_diagnosis_psychosocial (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  diagnosis_session_id uuid not null unique references public.nr1_diagnosis_sessions(id) on delete cascade,
  has_work_overload boolean,
  has_excessive_pressure boolean,
  has_role_ambiguity boolean,
  has_low_autonomy boolean,
  has_leadership_support_failure boolean,
  has_peer_conflict boolean,
  has_hostile_public_contact boolean,
  has_constant_interruptions boolean,
  has_task_accumulation boolean,
  has_communication_difficulty boolean,
  has_remote_isolation boolean,
  has_badly_managed_change boolean,
  has_report_channel boolean,
  notes text,
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  updated_by uuid default auth.uid() references auth.users(id) on delete set null
);

create table if not exists public.nr1_diagnosis_controls (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  diagnosis_session_id uuid not null unique references public.nr1_diagnosis_sessions(id) on delete cascade,
  has_collective_controls boolean,
  collective_controls_description text,
  has_administrative_controls boolean,
  administrative_controls_description text,
  has_epi boolean,
  controls_effectiveness text,
  controls_maintenance text,
  has_written_procedure boolean,
  has_worker_guidance boolean,
  notes text,
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  updated_by uuid default auth.uid() references auth.users(id) on delete set null
);

create table if not exists public.nr1_diagnosis_review (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  diagnosis_session_id uuid not null unique references public.nr1_diagnosis_sessions(id) on delete cascade,
  confirmed_hazards_json jsonb not null default '[]'::jsonb,
  confirmed_exposed_group_json jsonb not null default '[]'::jsonb,
  preliminary_priority text,
  reviewer_comment text,
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  updated_by uuid default auth.uid() references auth.users(id) on delete set null
);

create table if not exists public.nr1_gro_criteria (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  establishment_id uuid not null references public.nr1_establishments(id) on delete cascade,
  methodology_name text not null,
  severity_scale_json jsonb not null,
  probability_scale_json jsonb not null,
  risk_matrix_json jsonb not null,
  classification_rules_json jsonb not null,
  decision_rules_json jsonb not null,
  version integer not null default 1,
  is_active boolean not null default true,
  approved_at timestamptz,
  approved_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  updated_by uuid default auth.uid() references auth.users(id) on delete set null,
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id) on delete set null
);

create unique index if not exists nr1_gro_criteria_one_active_per_establishment_idx
  on public.nr1_gro_criteria(establishment_id)
  where is_active = true
    and deleted_at is null;

create table if not exists public.nr1_risks (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  establishment_id uuid not null references public.nr1_establishments(id) on delete cascade,
  department_id uuid not null references public.nr1_departments(id) on delete cascade,
  activity_id uuid not null references public.nr1_activities(id) on delete cascade,
  diagnosis_session_id uuid references public.nr1_diagnosis_sessions(id) on delete set null,
  title text not null,
  risk_category text not null
    check (risk_category in ('physical', 'chemical', 'biological', 'accident', 'ergonomics', 'psychosocial', 'mixed')),
  hazard_description text not null,
  source_circumstance text,
  exposed_group text,
  possible_harms text,
  existing_controls text,
  exposure_characterization text,
  severity_level text,
  probability_level text,
  risk_level text,
  classification text,
  recommended_measure text,
  suggested_responsible text,
  suggested_deadline date,
  status text not null default 'identified'
    check (status in ('identified', 'under_analysis', 'classified', 'action_defined', 'controlled', 'requires_review')),
  last_review_at timestamptz,
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  updated_by uuid default auth.uid() references auth.users(id) on delete set null,
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id) on delete set null
);

create table if not exists public.nr1_action_plans (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  establishment_id uuid not null references public.nr1_establishments(id) on delete cascade,
  risk_id uuid not null references public.nr1_risks(id) on delete cascade,
  title text not null,
  description text,
  measure_type text,
  responsible_name text,
  responsible_user_id uuid references auth.users(id) on delete set null,
  due_date date,
  monitoring_method text,
  evidence_method text,
  completion_indicator text,
  priority text,
  status text not null default 'open'
    check (status in ('open', 'in_progress', 'completed', 'overdue', 'awaiting_evidence', 'reopened')),
  notes text,
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  updated_by uuid default auth.uid() references auth.users(id) on delete set null,
  completed_at timestamptz,
  completed_by uuid references auth.users(id) on delete set null,
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id) on delete set null
);

create table if not exists public.nr1_action_followups (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  action_plan_id uuid not null references public.nr1_action_plans(id) on delete cascade,
  followup_date date not null,
  execution_check text,
  continuity_check text,
  inspection_result text,
  environmental_monitoring_result text,
  worker_participation_note text,
  effectiveness_result text,
  corrective_adjustment_needed boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  updated_by uuid default auth.uid() references auth.users(id) on delete set null
);

create table if not exists public.nr1_evidence_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  establishment_id uuid not null references public.nr1_establishments(id) on delete cascade,
  linked_entity_type text not null
    check (linked_entity_type in ('diagnosis_session', 'risk', 'action_plan', 'review_cycle', 'training_record', 'third_party')),
  linked_entity_id uuid not null,
  evidence_type text not null,
  title text not null,
  description text,
  file_url text,
  file_name text,
  reference_date date,
  responsible_name text,
  validation_status text not null default 'pending_validation'
    check (validation_status in ('pending_validation', 'validated', 'rejected', 'archived')),
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  updated_by uuid default auth.uid() references auth.users(id) on delete set null,
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id) on delete set null
);

create table if not exists public.nr1_document_versions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  establishment_id uuid not null references public.nr1_establishments(id) on delete cascade,
  document_type text not null
    check (document_type in ('inventory', 'action_plan', 'gro_criteria', 'review_report', 'evidence_pack')),
  source_snapshot_json jsonb not null,
  version integer not null default 1,
  file_url text,
  status text not null default 'generated'
    check (status in ('generated', 'superseded', 'archived')),
  generated_at timestamptz not null default now(),
  generated_by uuid default auth.uid() references auth.users(id) on delete set null,
  supersedes_document_id uuid references public.nr1_document_versions(id) on delete set null
);

create unique index if not exists nr1_document_versions_per_type_version_idx
  on public.nr1_document_versions(establishment_id, document_type, version);

create table if not exists public.nr1_review_cycles (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  establishment_id uuid not null references public.nr1_establishments(id) on delete cascade,
  trigger_type text not null
    check (trigger_type in ('periodic', 'post_measure', 'technology_change', 'process_change', 'ineffective_measure', 'accident_or_disease', 'legal_change', 'worker_or_cipa_request')),
  trigger_description text,
  opened_at timestamptz not null default now(),
  opened_by uuid default auth.uid() references auth.users(id) on delete set null,
  closed_at timestamptz,
  closed_by uuid references auth.users(id) on delete set null,
  affected_risks_json jsonb not null default '[]'::jsonb,
  affected_documents_json jsonb not null default '[]'::jsonb,
  status text not null default 'open'
    check (status in ('open', 'in_progress', 'closed')),
  notes text,
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  updated_by uuid default auth.uid() references auth.users(id) on delete set null
);

create table if not exists public.nr1_worker_participation_logs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  establishment_id uuid not null references public.nr1_establishments(id) on delete cascade,
  linked_entity_type text,
  linked_entity_id uuid,
  participation_type text not null
    check (participation_type in ('consultation', 'communication', 'feedback', 'meeting', 'workshop', 'survey')),
  channel text,
  summary text,
  participants_count integer,
  cipa_involved boolean not null default false,
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  updated_by uuid default auth.uid() references auth.users(id) on delete set null
);

create table if not exists public.nr1_audit_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  establishment_id uuid references public.nr1_establishments(id) on delete set null,
  module_name text not null default 'nr1',
  screen_key text,
  entity_type text not null,
  entity_id uuid not null,
  event_type text not null,
  old_value_json jsonb,
  new_value_json jsonb,
  persistence_type text not null
    check (persistence_type in ('draft', 'formal_version')),
  reason text,
  created_at timestamptz not null default now(),
  user_id uuid not null references auth.users(id) on delete restrict
);

create table if not exists public.nr1_draft_state (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  establishment_id uuid references public.nr1_establishments(id) on delete set null,
  screen_key text not null,
  record_type text not null,
  record_id uuid,
  payload_json jsonb not null default '{}'::jsonb,
  is_dirty boolean not null default false,
  last_saved_at timestamptz,
  saved_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  updated_by uuid default auth.uid() references auth.users(id) on delete set null
);

create table if not exists public.nr1_training_records (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  establishment_id uuid not null references public.nr1_establishments(id) on delete cascade,
  training_name text not null,
  target_audience text,
  periodicity text,
  last_date date,
  next_due_date date,
  certificate_file_url text,
  responsible_name text,
  status text
    check (status is null or status in ('up_to_date', 'due_soon', 'overdue')),
  notes text,
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  updated_by uuid default auth.uid() references auth.users(id) on delete set null
);

create table if not exists public.nr1_occupational_health_refs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  establishment_id uuid not null references public.nr1_establishments(id) on delete cascade,
  has_pcmso boolean,
  pcmso_valid_until date,
  technical_responsible text,
  work_related_leave_indicators text,
  accident_disease_indicators text,
  notes text,
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  updated_by uuid default auth.uid() references auth.users(id) on delete set null
);

create table if not exists public.nr1_third_parties (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  establishment_id uuid not null references public.nr1_establishments(id) on delete cascade,
  company_name text not null,
  cnpj text,
  provided_activity text,
  work_location text,
  responsible_name text,
  contact_info text,
  contractor_risk_to_third_party text,
  third_party_risk_to_contractor text,
  inventory_received boolean not null default false,
  action_plan_received boolean not null default false,
  notes text,
  status text not null default 'active'
    check (status in ('active', 'inactive', 'archived')),
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  updated_by uuid default auth.uid() references auth.users(id) on delete set null,
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id) on delete set null
);

do $$
declare
  r record;
begin
  for r in
    select c.table_name, c.column_name
    from information_schema.columns c
    where c.table_schema = 'public'
      and c.table_name like 'nr1_%'
      and c.column_name in ('tenant_id', 'establishment_id')
  loop
    execute format(
      'create index if not exists %I on public.%I (%I);',
      r.table_name || '_' || r.column_name || '_idx',
      r.table_name,
      r.column_name
    );
  end loop;
end $$;

create index if not exists nr1_company_contacts_company_id_idx
  on public.nr1_company_contacts(company_id);

create index if not exists nr1_establishments_company_id_idx
  on public.nr1_establishments(company_id);

create index if not exists nr1_departments_establishment_id_idx
  on public.nr1_departments(establishment_id);

create index if not exists nr1_activities_department_id_idx
  on public.nr1_activities(department_id);

create index if not exists nr1_diagnosis_sessions_activity_id_idx
  on public.nr1_diagnosis_sessions(activity_id);

create index if not exists nr1_risks_activity_id_idx
  on public.nr1_risks(activity_id);

create index if not exists nr1_risks_department_id_idx
  on public.nr1_risks(department_id);

create index if not exists nr1_risks_status_idx
  on public.nr1_risks(status);

create index if not exists nr1_action_plans_risk_id_idx
  on public.nr1_action_plans(risk_id);

create index if not exists nr1_action_plans_status_idx
  on public.nr1_action_plans(status);

create index if not exists nr1_action_followups_action_plan_id_idx
  on public.nr1_action_followups(action_plan_id);

create index if not exists nr1_evidence_items_linked_entity_idx
  on public.nr1_evidence_items(linked_entity_type, linked_entity_id);

create index if not exists nr1_review_cycles_status_idx
  on public.nr1_review_cycles(status);

create index if not exists nr1_audit_events_entity_idx
  on public.nr1_audit_events(entity_type, entity_id);

create index if not exists nr1_audit_events_created_at_idx
  on public.nr1_audit_events(created_at);

create index if not exists nr1_draft_state_screen_record_idx
  on public.nr1_draft_state(screen_key, record_type, record_id);

do $$
declare
  t text;
begin
  for t in
    select c.table_name
    from information_schema.columns c
    where c.table_schema = 'public'
      and c.table_name like 'nr1_%'
      and c.column_name = 'updated_at'
    group by c.table_name
  loop
    execute format('drop trigger if exists %I on public.%I;', t || '_touch_updated_at', t);
    execute format(
      'create trigger %I before update on public.%I for each row execute function public.icanhelp_nr1_touch_updated_at();',
      t || '_touch_updated_at',
      t
    );
  end loop;
end $$;

do $$
declare
  t text;
begin
  for t in
    select tablename
    from pg_tables
    where schemaname = 'public'
      and tablename like 'nr1_%'
  loop
    execute format('alter table public.%I enable row level security;', t);
    execute format('alter table public.%I force row level security;', t);
  end loop;
end $$;

do $$
declare
  t text;
  p_select text;
  p_insert text;
  p_update text;
  p_delete text;
begin
  for t in
    select tablename
    from pg_tables
    where schemaname = 'public'
      and tablename like 'nr1_%'
  loop
    p_select := t || '_select_member';
    p_insert := t || '_insert_member';
    p_update := t || '_update_member';
    p_delete := t || '_delete_admin';

    if not exists (
      select 1
      from pg_policies
      where schemaname = 'public'
        and tablename = t
        and policyname = p_select
    ) then
      execute format(
        'create policy %I on public.%I for select using (public.icanhelp_nr1_is_tenant_member(tenant_id));',
        p_select, t
      );
    end if;

    if not exists (
      select 1
      from pg_policies
      where schemaname = 'public'
        and tablename = t
        and policyname = p_insert
    ) then
      execute format(
        'create policy %I on public.%I for insert with check (public.icanhelp_nr1_is_tenant_member(tenant_id));',
        p_insert, t
      );
    end if;

    if not exists (
      select 1
      from pg_policies
      where schemaname = 'public'
        and tablename = t
        and policyname = p_update
    ) then
      execute format(
        'create policy %I on public.%I for update using (public.icanhelp_nr1_is_tenant_member(tenant_id)) with check (public.icanhelp_nr1_is_tenant_member(tenant_id));',
        p_update, t
      );
    end if;

    if not exists (
      select 1
      from pg_policies
      where schemaname = 'public'
        and tablename = t
        and policyname = p_delete
    ) then
      execute format(
        'create policy %I on public.%I for delete using (public.icanhelp_nr1_is_tenant_admin(tenant_id));',
        p_delete, t
      );
    end if;
  end loop;
end $$;

commit;