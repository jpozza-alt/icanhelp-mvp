begin;

create schema if not exists quarantine_backup;

do $block$
begin
  if to_regclass('public.consultas') is not null then
    execute 'create table if not exists quarantine_backup.consultas_bak_20260408 as table public.consultas';
    execute 'revoke all on table public.consultas from anon, authenticated';
    execute 'alter table public.consultas enable row level security';
    execute 'alter table public.consultas force row level security';
    execute $sql$comment on table public.consultas is 'Compatibilidade temporaria: objeto legado endurecido para evitar acesso indevido. Revisar e migrar dependencias restantes para o modelo tenant-aware.'$sql$;
  end if;

  if to_regclass('public.user_roles') is not null then
    execute 'create table if not exists quarantine_backup.user_roles_bak_20260408 as table public.user_roles';
    execute 'revoke all on table public.user_roles from anon, authenticated';
    execute 'alter table public.user_roles enable row level security';
    execute 'alter table public.user_roles force row level security';
    execute $sql$comment on table public.user_roles is 'Compatibilidade temporaria: migrada de user_roles para tenant_memberships. Revisar policies para modelos tenant-aware/contextuais.'$sql$;
  end if;

  if to_regclass('public.legal_articles') is not null then
    execute 'create table if not exists quarantine_backup.legal_articles_bak_20260408 as table public.legal_articles';
    execute 'revoke all on table public.legal_articles from anon, authenticated';
    execute 'alter table public.legal_articles enable row level security';
    execute 'alter table public.legal_articles force row level security';
    execute $sql$comment on table public.legal_articles is 'Compatibilidade temporaria: objeto legado endurecido. Revisar uso e migrar para estrutura tenant-aware/contextual.'$sql$;
  end if;

  if to_regclass('public.legal_bases') is not null then
    execute 'create table if not exists quarantine_backup.legal_bases_bak_20260408 as table public.legal_bases';
    execute 'revoke all on table public.legal_bases from anon, authenticated';
    execute 'alter table public.legal_bases enable row level security';
    execute 'alter table public.legal_bases force row level security';
    execute $sql$comment on table public.legal_bases is 'Compatibilidade temporaria: objeto legado endurecido. Revisar uso e migrar para estrutura tenant-aware/contextual.'$sql$;
  end if;
end
$block$;

commit;