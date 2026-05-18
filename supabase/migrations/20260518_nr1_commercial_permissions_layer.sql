-- Candidate migration V3
-- NR1 commercial permissions layer with RLS and seeds
-- Status: candidate only. Do not apply before review.
-- No NR1 core duplication.
-- No psychosocial score table.
-- No health history table.
-- No work leave events table.

create table if not exists public.subscription_plans (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (slug in ('essencial','inteligente','partner_sst','pasini'))
);

create table if not exists public.features (
  id uuid primary key default gen_random_uuid(),
  feature_key text not null unique,
  name text not null,
  description text,
  module text not null default 'nr1',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.plan_features (
  id uuid primary key default gen_random_uuid(),
  subscription_plan_id uuid not null references public.subscription_plans(id) on delete cascade,
  feature_id uuid not null references public.features(id) on delete cascade,
  is_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (subscription_plan_id, feature_id)
);

create table if not exists public.tenant_subscriptions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  subscription_plan_id uuid not null references public.subscription_plans(id),
  status text not null default 'trial'
    check (status in ('trial','active','past_due','suspended','cancelled')),
  starts_at timestamptz not null default now(),
  expires_at timestamptz,
  trial_ends_at timestamptz,
  billing_cycle text
    check (billing_cycle in ('monthly','yearly') or billing_cycle is null),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id)
);

create table if not exists public.role_permissions (
  id uuid primary key default gen_random_uuid(),
  role_key text not null
    check (role_key in (
      'owner',
      'admin',
      'hr_manager',
      'sst_manager',
      'sst_consultant',
      'supervisor',
      'employee',
      'pasini_consultant',
      'readonly_auditor'
    )),
  feature_id uuid not null references public.features(id) on delete cascade,
  can_view boolean not null default false,
  can_create boolean not null default false,
  can_edit boolean not null default false,
  can_delete boolean not null default false,
  can_approve boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (role_key, feature_id)
);

create table if not exists public.user_access_scope (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  role_key text not null
    check (role_key in (
      'owner',
      'admin',
      'hr_manager',
      'sst_manager',
      'sst_consultant',
      'supervisor',
      'employee',
      'pasini_consultant',
      'readonly_auditor'
    )),
  establishment_id uuid references public.nr1_establishments(id) on delete set null,
  department_id uuid references public.nr1_departments(id) on delete set null,
  access_scope text not null default 'global'
    check (access_scope in ('global','establishment','department')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (access_scope = 'global' and establishment_id is null and department_id is null)
    or
    (access_scope = 'establishment' and establishment_id is not null and department_id is null)
    or
    (access_scope = 'department' and establishment_id is not null and department_id is not null)
  )
);

alter table public.subscription_plans enable row level security;
alter table public.features enable row level security;
alter table public.plan_features enable row level security;
alter table public.tenant_subscriptions enable row level security;
alter table public.role_permissions enable row level security;
alter table public.user_access_scope enable row level security;

create index if not exists idx_features_feature_key
on public.features(feature_key);

create index if not exists idx_plan_features_plan
on public.plan_features(subscription_plan_id);

create index if not exists idx_plan_features_feature
on public.plan_features(feature_id);

create index if not exists idx_tenant_subscriptions_tenant
on public.tenant_subscriptions(tenant_id);

create index if not exists idx_role_permissions_role
on public.role_permissions(role_key);

create index if not exists idx_user_access_scope_user
on public.user_access_scope(user_id);

create index if not exists idx_user_access_scope_tenant
on public.user_access_scope(tenant_id);

create unique index if not exists uidx_user_access_scope_normalized
on public.user_access_scope (
  user_id,
  tenant_id,
  role_key,
  access_scope,
  coalesce(establishment_id, '00000000-0000-0000-0000-000000000000'::uuid),
  coalesce(department_id, '00000000-0000-0000-0000-000000000000'::uuid)
);

drop policy if exists subscription_plans_select_authenticated on public.subscription_plans;
create policy subscription_plans_select_authenticated
on public.subscription_plans
for select
to authenticated
using (is_active = true);

drop policy if exists features_select_authenticated on public.features;
create policy features_select_authenticated
on public.features
for select
to authenticated
using (is_active = true);

drop policy if exists plan_features_select_authenticated on public.plan_features;
create policy plan_features_select_authenticated
on public.plan_features
for select
to authenticated
using (true);

drop policy if exists role_permissions_select_authenticated on public.role_permissions;
create policy role_permissions_select_authenticated
on public.role_permissions
for select
to authenticated
using (true);

drop policy if exists tenant_subscriptions_select_member on public.tenant_subscriptions;
create policy tenant_subscriptions_select_member
on public.tenant_subscriptions
for select
to authenticated
using (public.icanhelp_nr1_is_tenant_member(tenant_id));

drop policy if exists tenant_subscriptions_insert_admin on public.tenant_subscriptions;
create policy tenant_subscriptions_insert_admin
on public.tenant_subscriptions
for insert
to authenticated
with check (public.icanhelp_nr1_is_tenant_admin(tenant_id));

drop policy if exists tenant_subscriptions_update_admin on public.tenant_subscriptions;
create policy tenant_subscriptions_update_admin
on public.tenant_subscriptions
for update
to authenticated
using (public.icanhelp_nr1_is_tenant_admin(tenant_id))
with check (public.icanhelp_nr1_is_tenant_admin(tenant_id));

drop policy if exists tenant_subscriptions_delete_admin on public.tenant_subscriptions;
create policy tenant_subscriptions_delete_admin
on public.tenant_subscriptions
for delete
to authenticated
using (public.icanhelp_nr1_is_tenant_admin(tenant_id));

drop policy if exists user_access_scope_select_own_or_admin on public.user_access_scope;
create policy user_access_scope_select_own_or_admin
on public.user_access_scope
for select
to authenticated
using (
  user_id = auth.uid()
  or public.icanhelp_nr1_is_tenant_admin(tenant_id)
);

drop policy if exists user_access_scope_insert_admin on public.user_access_scope;
create policy user_access_scope_insert_admin
on public.user_access_scope
for insert
to authenticated
with check (public.icanhelp_nr1_is_tenant_admin(tenant_id));

drop policy if exists user_access_scope_update_admin on public.user_access_scope;
create policy user_access_scope_update_admin
on public.user_access_scope
for update
to authenticated
using (public.icanhelp_nr1_is_tenant_admin(tenant_id))
with check (public.icanhelp_nr1_is_tenant_admin(tenant_id));

drop policy if exists user_access_scope_delete_admin on public.user_access_scope;
create policy user_access_scope_delete_admin
on public.user_access_scope
for delete
to authenticated
using (public.icanhelp_nr1_is_tenant_admin(tenant_id));

insert into public.subscription_plans
(slug, name, description, sort_order)
values
('essencial','Essencial','Conformidade basica NR1',1),
('inteligente','Inteligente','Motor psicossocial invisivel',2),
('partner_sst','Partner SST','Operacao multiempresa SST',3),
('pasini','Pasini','Transformacao organizacional assistida',4)
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  sort_order = excluded.sort_order,
  updated_at = now();

insert into public.features
(feature_key, name, description, module)
values
('nr1_guided_journey','Jornada NR1 guiada','Fluxo guiado principal do modulo NR1','nr1'),
('nr1_company_structure','Empresa e estabelecimentos','Cadastro da estrutura organizacional','nr1'),
('nr1_diagnosis','Diagnostico guiado','Diagnostico orientado por setor e atividade','nr1'),
('nr1_inventory','Inventario de riscos','Geracao e manutencao do inventario de riscos','nr1'),
('nr1_action_plan','Plano de acao','Plano de acao com responsaveis, prazos e status','nr1'),
('nr1_evidence_center','Evidencias','Gestao de evidencias e documentos','nr1'),
('nr1_reviews','Revisoes','Ciclos de revisao e reavaliacao','nr1'),
('nr1_autosave','Autosalvamento','Rascunho automatico durante a jornada','nr1'),
('nr1_audit_trail','Trilha de auditoria','Registro de eventos relevantes','nr1'),
('nr1_basic_alerts','Alertas basicos','Alertas basicos de pendencias e risco','nr1'),
('nr1_pgr_export','Exportacao PGR','Exportacao de documentos do PGR','nr1'),
('psychosocial_basic','Psicossocial basico','Identificacao preliminar de fatores psicossociais','nr1'),
('iso45003_engine','Motor ISO 45003','Motor invisivel de classificacao psicossocial','nr1'),
('psychosocial_scoring','Score psicossocial','Score interno de priorizacao psicossocial','nr1'),
('psychosocial_radar','Radar psicossocial','Visao consolidada de fatores psicossociais','nr1'),
('smart_alerts','Alertas inteligentes','Alertas por combinacao de fatores e criticidade','nr1'),
('nr1_maturity_score','Score de maturidade NR1','Indicador de maturidade da jornada NR1','nr1'),
('partner_mode','Modo Partner SST','Modo operacional para parceiro SST','nr1'),
('multi_company_portfolio','Carteira multiempresa','Gestao de multiplas empresas/clientes','nr1'),
('advanced_sst_mode','Modo tecnico SST','Visao tecnica avancada para SST','nr1'),
('technical_opinion','Parecer tecnico','Registro de parecer e validacao tecnica','nr1'),
('pasini_protocols','Protocolos Pasini','Protocolos consultivos Pasini','nr1'),
('organizational_reading','Leitura organizacional','Analise organizacional e cultural','nr1'),
('leadership_journey','Jornada de lideranca','Trilhas de lideranca e desenvolvimento','nr1'),
('climate_longitudinal','Clima longitudinal','Acompanhamento longitudinal de clima','nr1'),
('assisted_interventions','Intervencoes assistidas','Intervencoes consultivas assistidas','nr1'),
('executive_reports','Relatorios executivos','Relatorios executivos e estrategicos','nr1')
on conflict (feature_key) do update set
  name = excluded.name,
  description = excluded.description,
  module = excluded.module,
  updated_at = now();

with plan_feature_pairs(plan_slug, feature_key) as (
  values
  ('essencial','nr1_guided_journey'),
  ('essencial','nr1_company_structure'),
  ('essencial','nr1_diagnosis'),
  ('essencial','nr1_inventory'),
  ('essencial','nr1_action_plan'),
  ('essencial','nr1_evidence_center'),
  ('essencial','nr1_reviews'),
  ('essencial','nr1_autosave'),
  ('essencial','nr1_audit_trail'),
  ('essencial','nr1_basic_alerts'),
  ('essencial','nr1_pgr_export'),
  ('essencial','psychosocial_basic'),

  ('inteligente','nr1_guided_journey'),
  ('inteligente','nr1_company_structure'),
  ('inteligente','nr1_diagnosis'),
  ('inteligente','nr1_inventory'),
  ('inteligente','nr1_action_plan'),
  ('inteligente','nr1_evidence_center'),
  ('inteligente','nr1_reviews'),
  ('inteligente','nr1_autosave'),
  ('inteligente','nr1_audit_trail'),
  ('inteligente','nr1_basic_alerts'),
  ('inteligente','nr1_pgr_export'),
  ('inteligente','psychosocial_basic'),
  ('inteligente','iso45003_engine'),
  ('inteligente','psychosocial_scoring'),
  ('inteligente','psychosocial_radar'),
  ('inteligente','smart_alerts'),
  ('inteligente','nr1_maturity_score'),

  ('partner_sst','nr1_guided_journey'),
  ('partner_sst','nr1_company_structure'),
  ('partner_sst','nr1_diagnosis'),
  ('partner_sst','nr1_inventory'),
  ('partner_sst','nr1_action_plan'),
  ('partner_sst','nr1_evidence_center'),
  ('partner_sst','nr1_reviews'),
  ('partner_sst','nr1_autosave'),
  ('partner_sst','nr1_audit_trail'),
  ('partner_sst','nr1_basic_alerts'),
  ('partner_sst','nr1_pgr_export'),
  ('partner_sst','psychosocial_basic'),
  ('partner_sst','iso45003_engine'),
  ('partner_sst','psychosocial_scoring'),
  ('partner_sst','psychosocial_radar'),
  ('partner_sst','smart_alerts'),
  ('partner_sst','nr1_maturity_score'),
  ('partner_sst','partner_mode'),
  ('partner_sst','multi_company_portfolio'),
  ('partner_sst','advanced_sst_mode'),
  ('partner_sst','technical_opinion'),

  ('pasini','nr1_guided_journey'),
  ('pasini','nr1_company_structure'),
  ('pasini','nr1_diagnosis'),
  ('pasini','nr1_inventory'),
  ('pasini','nr1_action_plan'),
  ('pasini','nr1_evidence_center'),
  ('pasini','nr1_reviews'),
  ('pasini','nr1_autosave'),
  ('pasini','nr1_audit_trail'),
  ('pasini','nr1_basic_alerts'),
  ('pasini','nr1_pgr_export'),
  ('pasini','psychosocial_basic'),
  ('pasini','iso45003_engine'),
  ('pasini','psychosocial_scoring'),
  ('pasini','psychosocial_radar'),
  ('pasini','smart_alerts'),
  ('pasini','nr1_maturity_score'),
  ('pasini','partner_mode'),
  ('pasini','multi_company_portfolio'),
  ('pasini','advanced_sst_mode'),
  ('pasini','technical_opinion'),
  ('pasini','pasini_protocols'),
  ('pasini','organizational_reading'),
  ('pasini','leadership_journey'),
  ('pasini','climate_longitudinal'),
  ('pasini','assisted_interventions'),
  ('pasini','executive_reports')
)
insert into public.plan_features
(subscription_plan_id, feature_id, is_enabled)
select sp.id, f.id, true
from plan_feature_pairs pfp
join public.subscription_plans sp on sp.slug = pfp.plan_slug
join public.features f on f.feature_key = pfp.feature_key
on conflict (subscription_plan_id, feature_id) do update set
  is_enabled = true,
  updated_at = now();
