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
