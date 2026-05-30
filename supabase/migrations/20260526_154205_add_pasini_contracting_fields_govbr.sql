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
