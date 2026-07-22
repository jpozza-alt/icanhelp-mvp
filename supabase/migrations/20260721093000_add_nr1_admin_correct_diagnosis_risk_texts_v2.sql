-- Extends the narrow administrative repair with two additional risk text fields.
-- The v1 function remains available temporarily for backend rollback only.

create function public.nr1_admin_correct_diagnosis_risk_texts_v2(
  p_tenant_id uuid,
  p_establishment_id uuid,
  p_risk_id uuid,
  p_diagnosis_session_id uuid,
  p_diagnosis_review_id uuid,
  p_expected_risk_title text,
  p_expected_risk_exposed_group text,
  p_expected_risk_source_circumstance text,
  p_expected_risk_hazard_description text,
  p_expected_risk_exposure_characterization text,
  p_expected_risk_updated_at timestamptz,
  p_expected_review_exposed_group_json jsonb,
  p_expected_review_updated_at timestamptz,
  p_new_risk_title text,
  p_new_risk_exposed_group text,
  p_new_risk_source_circumstance text,
  p_new_risk_hazard_description text,
  p_new_risk_exposure_characterization text,
  p_new_review_label text,
  p_actor_user_id uuid,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_risk public.nr1_risks%rowtype;
  v_review public.nr1_diagnosis_review%rowtype;
  v_new_review_json jsonb;
  v_risk_updated_at timestamptz;
  v_review_updated_at timestamptz;
begin
  if p_actor_user_id is null then
    raise exception using errcode = '22023', message = 'actor_user_id_required';
  end if;

  if
    nullif(btrim(p_new_risk_title), '') is null or
    nullif(btrim(p_new_risk_exposed_group), '') is null or
    nullif(btrim(p_new_risk_source_circumstance), '') is null or
    nullif(btrim(p_expected_risk_hazard_description), '') is null or
    (
      p_expected_risk_exposure_characterization is not null and
      nullif(btrim(p_expected_risk_exposure_characterization), '') is null
    ) or
    nullif(btrim(p_new_risk_hazard_description), '') is null or
    nullif(btrim(p_new_risk_exposure_characterization), '') is null or
    nullif(btrim(p_new_review_label), '') is null or
    nullif(btrim(p_reason), '') is null
  then
    raise exception using errcode = '22023', message = 'new_text_and_reason_required';
  end if;

  if
    length(btrim(p_new_risk_title)) > 1000 or
    length(btrim(p_new_risk_exposed_group)) > 1000 or
    length(btrim(p_new_risk_source_circumstance)) > 1000 or
    length(btrim(p_expected_risk_hazard_description)) > 4000 or
    (
      p_expected_risk_exposure_characterization is not null and
      length(btrim(p_expected_risk_exposure_characterization)) > 4000
    ) or
    length(btrim(p_new_risk_hazard_description)) > 4000 or
    length(btrim(p_new_risk_exposure_characterization)) > 4000 or
    length(btrim(p_new_review_label)) > 1000 or
    length(btrim(p_reason)) > 500
  then
    raise exception using errcode = '22023', message = 'correction_text_too_long';
  end if;

  if jsonb_typeof(p_expected_review_exposed_group_json) <> 'array'
    or jsonb_array_length(p_expected_review_exposed_group_json) <> 1
    or jsonb_typeof(p_expected_review_exposed_group_json -> 0) <> 'object'
  then
    raise exception using errcode = '22023', message = 'expected_review_json_must_contain_one_object';
  end if;

  select r.*
    into v_risk
    from public.nr1_risks r
   where r.id = p_risk_id
     and r.tenant_id = p_tenant_id
     and r.establishment_id = p_establishment_id
     and r.diagnosis_session_id = p_diagnosis_session_id
     and r.deleted_at is null
   for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'risk_not_found_for_supplied_scope_and_ids';
  end if;

  select dr.*
    into v_review
    from public.nr1_diagnosis_review dr
    join public.nr1_diagnosis_sessions ds
      on ds.id = dr.diagnosis_session_id
     and ds.tenant_id = dr.tenant_id
   where dr.id = p_diagnosis_review_id
     and dr.tenant_id = p_tenant_id
     and dr.diagnosis_session_id = p_diagnosis_session_id
     and ds.establishment_id = p_establishment_id
     and ds.deleted_at is null
   for update of dr;

  if not found then
    raise exception using errcode = 'P0002', message = 'review_not_found_for_supplied_scope_and_ids';
  end if;

  if
    v_risk.title is distinct from p_expected_risk_title or
    v_risk.exposed_group is distinct from p_expected_risk_exposed_group or
    v_risk.source_circumstance is distinct from p_expected_risk_source_circumstance or
    v_risk.hazard_description is distinct from p_expected_risk_hazard_description or
    v_risk.exposure_characterization is distinct from p_expected_risk_exposure_characterization or
    v_risk.updated_at is distinct from p_expected_risk_updated_at
  then
    raise exception using errcode = '40001', message = 'risk_precondition_failed';
  end if;

  if
    v_review.confirmed_exposed_group_json is distinct from p_expected_review_exposed_group_json or
    v_review.updated_at is distinct from p_expected_review_updated_at
  then
    raise exception using errcode = '40001', message = 'review_precondition_failed';
  end if;

  v_new_review_json := jsonb_set(
    v_review.confirmed_exposed_group_json,
    '{0,label}',
    to_jsonb(btrim(p_new_review_label)),
    true
  );

  update public.nr1_risks
     set title = btrim(p_new_risk_title),
         exposed_group = btrim(p_new_risk_exposed_group),
         source_circumstance = btrim(p_new_risk_source_circumstance),
         hazard_description = btrim(p_new_risk_hazard_description),
         exposure_characterization = btrim(p_new_risk_exposure_characterization),
         updated_by = p_actor_user_id
   where id = p_risk_id
  returning updated_at into v_risk_updated_at;

  update public.nr1_diagnosis_review
     set confirmed_exposed_group_json = v_new_review_json,
         updated_by = p_actor_user_id
   where id = p_diagnosis_review_id
  returning updated_at into v_review_updated_at;

  insert into public.nr1_audit_events (
    tenant_id,
    establishment_id,
    module_name,
    screen_key,
    entity_type,
    entity_id,
    event_type,
    old_value_json,
    new_value_json,
    persistence_type,
    reason,
    user_id
  )
  values
  (
    p_tenant_id,
    p_establishment_id,
    'nr1',
    'nr1_admin_diagnosis_risk_text_correction',
    'nr1_risk',
    p_risk_id,
    'administrative_text_correction',
    jsonb_build_object(
      'title', v_risk.title,
      'exposed_group', v_risk.exposed_group,
      'source_circumstance', v_risk.source_circumstance,
      'hazard_description', v_risk.hazard_description,
      'exposure_characterization', v_risk.exposure_characterization,
      'updated_at', v_risk.updated_at
    ),
    jsonb_build_object(
      'title', btrim(p_new_risk_title),
      'exposed_group', btrim(p_new_risk_exposed_group),
      'source_circumstance', btrim(p_new_risk_source_circumstance),
      'hazard_description', btrim(p_new_risk_hazard_description),
      'exposure_characterization', btrim(p_new_risk_exposure_characterization),
      'updated_at', v_risk_updated_at,
      'diagnosis_session_id', p_diagnosis_session_id,
      'diagnosis_review_id', p_diagnosis_review_id
    ),
    'formal_version',
    btrim(p_reason),
    p_actor_user_id
  ),
  (
    p_tenant_id,
    p_establishment_id,
    'nr1',
    'nr1_admin_diagnosis_risk_text_correction',
    'nr1_diagnosis_review',
    p_diagnosis_review_id,
    'administrative_text_correction',
    jsonb_build_object(
      'confirmed_exposed_group_json', v_review.confirmed_exposed_group_json,
      'updated_at', v_review.updated_at
    ),
    jsonb_build_object(
      'confirmed_exposed_group_json', v_new_review_json,
      'updated_at', v_review_updated_at,
      'diagnosis_session_id', p_diagnosis_session_id,
      'risk_id', p_risk_id
    ),
    'formal_version',
    btrim(p_reason),
    p_actor_user_id
  );

  return jsonb_build_object(
    'tenant_id', p_tenant_id,
    'establishment_id', p_establishment_id,
    'risk_id', p_risk_id,
    'risk_updated_at', v_risk_updated_at,
    'diagnosis_session_id', p_diagnosis_session_id,
    'diagnosis_review_id', p_diagnosis_review_id,
    'review_updated_at', v_review_updated_at,
    'audit_events_created', 2
  );
end;
$$;

revoke all on function public.nr1_admin_correct_diagnosis_risk_texts_v2(
  uuid, uuid, uuid, uuid, uuid,
  text, text, text, text, text, timestamptz, jsonb, timestamptz,
  text, text, text, text, text, text, uuid, text
) from public, anon, authenticated;

grant execute on function public.nr1_admin_correct_diagnosis_risk_texts_v2(
  uuid, uuid, uuid, uuid, uuid,
  text, text, text, text, text, timestamptz, jsonb, timestamptz,
  text, text, text, text, text, text, uuid, text
) to service_role;
