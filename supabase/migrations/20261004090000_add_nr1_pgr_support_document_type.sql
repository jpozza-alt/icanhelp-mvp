begin;

alter table public.nr1_document_versions
  drop constraint if exists nr1_document_versions_document_type_check;

alter table public.nr1_document_versions
  add constraint nr1_document_versions_document_type_check
  check (
    document_type in (
      'inventory',
      'action_plan',
      'gro_criteria',
      'review_report',
      'evidence_pack',
      'pgr_support_document'
    )
  );

comment on constraint nr1_document_versions_document_type_check
  on public.nr1_document_versions
  is 'pgr_support_document e documento de apoio e nao representa formalizacao, aprovacao profissional ou assinatura do PGR.';

alter table public.nr1_audit_events
  drop constraint if exists nr1_audit_events_persistence_type_check;

alter table public.nr1_audit_events
  add constraint nr1_audit_events_persistence_type_check
  check (
    persistence_type in (
      'draft',
      'formal_version',
      'versioned_support_document'
    )
  );

comment on constraint nr1_audit_events_persistence_type_check
  on public.nr1_audit_events
  is 'versioned_support_document identifica documento versionado de apoio ao PGR sem atribuir natureza de PGR formal.';

create or replace function public.nr1_pgr_approvals_validate_document_version()
returns trigger
language plpgsql
as $$
begin
    if not exists (
        select 1
        from public.nr1_document_versions dv
        where dv.id = new.document_version_id
          and dv.tenant_id = new.tenant_id
          and dv.establishment_id = new.establishment_id
          and dv.document_type = 'review_report'
    ) then
        raise exception 'document_version_id must reference a review_report belonging to the same tenant_id and establishment_id';
    end if;

    return new;
end;
$$;

commit;
