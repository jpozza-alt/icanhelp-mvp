-- OFFICIAL MIGRATION — icanHelp NR-1
-- icanHelp NR-1
-- Objetivo: criar tabela filha auditável para fatores psicossociais por sessão.
--
-- Decisões de segurança incorporadas:
-- 1. tenant_id direto na tabela filha.
-- 2. FK composta para impedir mistura entre tenant, bloco psicossocial e sessão.
-- 3. factor_key com lista fechada.
-- 4. RLS habilitado e forçado.
-- 5. Policies alinhadas ao padrão real do banco:
--    - member: select/insert/update
--    - admin: delete
--
-- Revisada por rollback validation antes de promover ao repositório.

begin;

-- Índices únicos auxiliares para permitir FKs compostas seguras.
-- Eles não mudam dados existentes e são compatíveis com as PKs já existentes.
-- A finalidade é garantir integridade tenant/bloco/sessão sem depender apenas de RLS.

create unique index if not exists nr1_diag_psycho_id_session_tenant_uidx
  on public.nr1_diagnosis_psychosocial (id, diagnosis_session_id, tenant_id);

create unique index if not exists nr1_diag_sessions_id_tenant_uidx
  on public.nr1_diagnosis_sessions (id, tenant_id);

create table if not exists public.nr1_diagnosis_psychosocial_factors (
  id uuid primary key default gen_random_uuid(),

  tenant_id uuid not null references public.tenants(id) on delete restrict,

  diagnosis_psychosocial_id uuid not null,
  diagnosis_session_id uuid not null,

  factor_key text not null,
  factor_label text not null,

  status text not null default 'not_observed',
  confidence_level text not null default 'low',

  sources jsonb not null default '[]'::jsonb,

  justification text,
  evidence_summary text,
  investigation_pending boolean not null default false,
  pending_action text,

  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id),

  constraint nr1_diag_psy_factors_psychosocial_fk
    foreign key (diagnosis_psychosocial_id, diagnosis_session_id, tenant_id)
    references public.nr1_diagnosis_psychosocial (id, diagnosis_session_id, tenant_id)
    on delete cascade,

  constraint nr1_diag_psy_factors_session_fk
    foreign key (diagnosis_session_id, tenant_id)
    references public.nr1_diagnosis_sessions (id, tenant_id)
    on delete cascade,

  constraint nr1_diag_psy_factors_key_check
    check (factor_key in (
      'has_work_overload',
      'has_excessive_pressure',
      'has_role_ambiguity',
      'has_low_autonomy',
      'has_leadership_support_failure',
      'has_peer_conflict',
      'has_hostile_public_contact',
      'has_constant_interruptions',
      'has_task_accumulation',
      'has_communication_difficulty',
      'has_remote_isolation',
      'has_badly_managed_change',
      'has_report_channel'
    )),

  constraint nr1_diag_psy_factors_status_check
    check (status in (
      'not_observed',
      'evidence_found',
      'needs_investigation',
      'not_applicable'
    )),

  constraint nr1_diag_psy_factors_confidence_check
    check (confidence_level in (
      'low',
      'medium',
      'high'
    )),

  constraint nr1_diag_psy_factors_sources_array_check
    check (jsonb_typeof(sources) = 'array'),

  constraint nr1_diag_psy_factors_unique_factor_per_block
    unique (diagnosis_psychosocial_id, factor_key)
);

create index if not exists nr1_diag_psy_factors_tenant_id_idx
  on public.nr1_diagnosis_psychosocial_factors (tenant_id);

create index if not exists nr1_diag_psy_factors_session_id_idx
  on public.nr1_diagnosis_psychosocial_factors (diagnosis_session_id);

create index if not exists nr1_diag_psy_factors_block_id_idx
  on public.nr1_diagnosis_psychosocial_factors (diagnosis_psychosocial_id);

create index if not exists nr1_diag_psy_factors_factor_key_idx
  on public.nr1_diagnosis_psychosocial_factors (factor_key);

create index if not exists nr1_diag_psy_factors_status_idx
  on public.nr1_diagnosis_psychosocial_factors (status);

create index if not exists nr1_diag_psy_factors_pending_idx
  on public.nr1_diagnosis_psychosocial_factors (tenant_id, investigation_pending);

alter table public.nr1_diagnosis_psychosocial_factors enable row level security;
alter table public.nr1_diagnosis_psychosocial_factors force row level security;

drop policy if exists nr1_diag_psy_factors_select_member
  on public.nr1_diagnosis_psychosocial_factors;

create policy nr1_diag_psy_factors_select_member
  on public.nr1_diagnosis_psychosocial_factors
  for select
  using (icanhelp_nr1_is_tenant_member(tenant_id));

drop policy if exists nr1_diag_psy_factors_insert_member
  on public.nr1_diagnosis_psychosocial_factors;

create policy nr1_diag_psy_factors_insert_member
  on public.nr1_diagnosis_psychosocial_factors
  for insert
  with check (icanhelp_nr1_is_tenant_member(tenant_id));

drop policy if exists nr1_diag_psy_factors_update_member
  on public.nr1_diagnosis_psychosocial_factors;

create policy nr1_diag_psy_factors_update_member
  on public.nr1_diagnosis_psychosocial_factors
  for update
  using (icanhelp_nr1_is_tenant_member(tenant_id))
  with check (icanhelp_nr1_is_tenant_member(tenant_id));

drop policy if exists nr1_diag_psy_factors_delete_admin
  on public.nr1_diagnosis_psychosocial_factors;

create policy nr1_diag_psy_factors_delete_admin
  on public.nr1_diagnosis_psychosocial_factors
  for delete
  using (icanhelp_nr1_is_tenant_admin(tenant_id));

comment on table public.nr1_diagnosis_psychosocial_factors is
  'Fatores psicossociais analisados por sessão NR-1. Não armazena dados clínicos, CID, prontuário, sintomas individuais ou nome de trabalhador.';

comment on column public.nr1_diagnosis_psychosocial_factors.sources is
  'Lista estruturada de fontes ocupacionais/agregadas usadas para justificar o fator. Não registrar dado clínico individual.';

comment on column public.nr1_diagnosis_psychosocial_factors.status is
  'Status do fator: not_observed, evidence_found, needs_investigation ou not_applicable.';

comment on column public.nr1_diagnosis_psychosocial_factors.confidence_level is
  'Nível de confiança da informação: low, medium ou high.';

commit;
