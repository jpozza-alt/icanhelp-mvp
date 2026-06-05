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
