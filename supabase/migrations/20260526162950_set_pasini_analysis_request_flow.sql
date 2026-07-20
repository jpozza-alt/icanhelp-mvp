-- Candidate additive migration for analysis request flow.
-- Safe to review before applying. No execution performed by this script.

do $$
begin
  if to_regclass('public.pasini_recruitment_requests') is null then
    raise exception 'Table public.pasini_recruitment_requests does not exist';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'pasini_recruitment_requests'
      and column_name = 'status'
  ) then
    raise exception 'Column status does not exist on public.pasini_recruitment_requests';
  end if;
end $$;

alter table public.pasini_recruitment_requests
  alter column status set default 'pending_consultancy_review';

comment on column public.pasini_recruitment_requests.status is
  'Fluxo comercial: pending_consultancy_review, proposal_ready, pending_govbr_signature, contracted_signed, canceled.';

comment on column public.pasini_recruitment_requests.govbr_signature_status is
  'Status gov.br. No envio inicial fica not_applicable, pois ainda nao existe proposta ou ordem de servico para assinatura.';

comment on column public.pasini_recruitment_requests.mandatory_declarations is
  'No formulario publico deve registrar apenas o aceite unico de autorizacao para analise. Declaracoes completas ficam na proposta ou ordem de servico.';
