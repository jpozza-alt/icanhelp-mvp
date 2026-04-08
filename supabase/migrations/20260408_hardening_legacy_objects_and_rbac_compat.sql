begin;

create schema if not exists quarantine_backup;

create table if not exists quarantine_backup.consultas_bak_20260408
as table public.consultas;

create table if not exists quarantine_backup.user_roles_bak_20260408
as table public.user_roles;

create table if not exists quarantine_backup.legal_articles_bak_20260408
as table public.legal_articles;

create table if not exists quarantine_backup.legal_bases_bak_20260408
as table public.legal_bases;

revoke all on table public.consultas from anon, authenticated;
revoke all on table public.user_roles from anon, authenticated;
revoke all on table public.legal_articles from anon, authenticated;
revoke all on table public.legal_bases from anon, authenticated;

alter table public.consultas enable row level security;
alter table public.consultas force row level security;

alter table public.user_roles enable row level security;
alter table public.user_roles force row level security;

alter table public.legal_articles enable row level security;
alter table public.legal_articles force row level security;

alter table public.legal_bases enable row level security;
alter table public.legal_bases force row level security;

comment on table public.consultas is
'LEGACY/QUARANTINE: objeto fora do trilho oficial consultations. Fechado por RLS até validação manual.';

comment on table public.user_roles is
'LEGACY/QUARANTINE: objeto fora do trilho oficial tenant_memberships. Fechado por RLS até validação manual.';

comment on table public.legal_articles is
'QUARANTINE: sem evidência atual de uso no fluxo oficial. Fechado por RLS até validação manual.';

comment on table public.legal_bases is
'QUARANTINE: sem evidência atual de uso no fluxo oficial. Fechado por RLS até validação manual.';

create or replace function public.is_admin(uid uuid)
returns boolean
language sql
stable
as $function$
  select exists(
    select 1
    from public.tenant_memberships tm
    where tm.user_id = uid
      and tm.role in ('owner', 'admin')
  );
$function$;

comment on function public.is_admin(uuid) is
'Compatibilidade temporária: migrada de user_roles para tenant_memberships. Revisar policies para modelos tenant-aware/contextuais.';

commit;
