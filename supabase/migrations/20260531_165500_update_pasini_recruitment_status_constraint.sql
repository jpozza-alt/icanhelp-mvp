alter table public.pasini_recruitment_requests
drop constraint if exists pasini_recruitment_requests_status_check;

alter table public.pasini_recruitment_requests
add constraint pasini_recruitment_requests_status_check
check (
  status in (
    'new',
    'in_review',
    'contacted',
    'proposal_sent',
    'hired',
    'cancelled',
    'archived',
    'pending_consultancy_review',
    'proposal_ready',
    'pending_govbr_signature',
    'contracted_signed',
    'canceled'
  )
);

alter table public.pasini_recruitment_requests
alter column status set default 'pending_consultancy_review';
