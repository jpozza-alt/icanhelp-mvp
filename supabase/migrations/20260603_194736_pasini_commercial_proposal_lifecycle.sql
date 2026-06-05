begin;

alter table public.pasini_recruitment_requests
  add column if not exists proposal_status text not null default 'pending_consultancy_review',
  add column if not exists proposal_version integer not null default 1,
  add column if not exists proposal_sent_at timestamptz,
  add column if not exists consultancy_decision text,
  add column if not exists consultancy_feedback text,
  add column if not exists commercial_conditions text,
  add column if not exists consultancy_decided_at timestamptz,
  add column if not exists consultancy_decided_by uuid references auth.users(id) on delete set null,
  add column if not exists client_acceptance_status text,
  add column if not exists client_accepted_at timestamptz,
  add column if not exists proponent_signature_name text,
  add column if not exists proponent_signature_document text,
  add column if not exists proponent_signature_role text,
  add column if not exists proponent_signature_email text,
  add column if not exists proponent_signed_at timestamptz;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'pasini_recruitment_requests_proposal_status_chk'
  ) then
    alter table public.pasini_recruitment_requests
      add constraint pasini_recruitment_requests_proposal_status_chk
      check (
        proposal_status in (
          'pending_consultancy_review',
          'approved_for_client_acceptance',
          'returned_with_conditions',
          'sent_to_client',
          'accepted_by_client',
          'declined_by_client',
          'cancelled'
        )
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'pasini_recruitment_requests_proposal_version_chk'
  ) then
    alter table public.pasini_recruitment_requests
      add constraint pasini_recruitment_requests_proposal_version_chk
      check (proposal_version >= 1);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'pasini_recruitment_requests_consultancy_decision_chk'
  ) then
    alter table public.pasini_recruitment_requests
      add constraint pasini_recruitment_requests_consultancy_decision_chk
      check (
        consultancy_decision is null
        or consultancy_decision in ('approved', 'returned_with_conditions')
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'pasini_recruitment_requests_client_acceptance_status_chk'
  ) then
    alter table public.pasini_recruitment_requests
      add constraint pasini_recruitment_requests_client_acceptance_status_chk
      check (
        client_acceptance_status is null
        or client_acceptance_status in ('pending', 'accepted', 'declined')
      );
  end if;
end $$;

create index if not exists idx_pasini_recruitment_requests_proposal_status
  on public.pasini_recruitment_requests(proposal_status);

create index if not exists idx_pasini_recruitment_requests_consultancy_decision
  on public.pasini_recruitment_requests(consultancy_decision);

create index if not exists idx_pasini_recruitment_requests_client_acceptance_status
  on public.pasini_recruitment_requests(client_acceptance_status);

create index if not exists idx_pasini_recruitment_requests_proponent_signed_at
  on public.pasini_recruitment_requests(proponent_signed_at);

comment on column public.pasini_recruitment_requests.proposal_status is
'Commercial proposal lifecycle status for recruitment and selection requests.';

comment on column public.pasini_recruitment_requests.consultancy_decision is
'Consultancy decision: approved commercial conditions or returned with revised conditions.';

comment on column public.pasini_recruitment_requests.commercial_conditions is
'Commercial terms proposed or revised by the consultancy.';

comment on column public.pasini_recruitment_requests.client_acceptance_status is
'Client/proponent acceptance status for the commercial proposal.';

comment on column public.pasini_recruitment_requests.proponent_signature_name is
'Name used by the proponent for acceptance/signature.';

comment on column public.pasini_recruitment_requests.proponent_signature_document is
'CPF or CNPJ used by the proponent for acceptance/signature.';

commit;
