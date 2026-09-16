-- PW-02 HARDENING
-- Multi-tenant referential integrity.
-- Local validation candidate.
--
-- Principle:
-- tenant-scoped relationships must preserve tenant_id across references.

-- ------------------------------------------------------------------
-- 1. Missing candidate keys
-- ------------------------------------------------------------------

CREATE UNIQUE INDEX IF NOT EXISTS ux_nr1_companies_id_tenant
    ON public.nr1_companies (id, tenant_id);

CREATE UNIQUE INDEX IF NOT EXISTS ux_nr1_document_versions_id_tenant
    ON public.nr1_document_versions (id, tenant_id);

-- ------------------------------------------------------------------
-- 2. Replace simple tenant-scoped FKs with tenant-aware FKs
-- ------------------------------------------------------------------

ALTER TABLE public.nr1_action_followups
    DROP CONSTRAINT nr1_action_followups_action_plan_id_fkey,
    ADD CONSTRAINT nr1_action_followups_action_plan_id_tenant_fkey
        FOREIGN KEY (action_plan_id, tenant_id)
        REFERENCES public.nr1_action_plans (id, tenant_id)
        ON DELETE CASCADE;

ALTER TABLE public.nr1_action_plans
    DROP CONSTRAINT nr1_action_plans_establishment_id_fkey,
    ADD CONSTRAINT nr1_action_plans_establishment_id_tenant_fkey
        FOREIGN KEY (establishment_id, tenant_id)
        REFERENCES public.nr1_establishments (id, tenant_id)
        ON DELETE CASCADE,
    DROP CONSTRAINT nr1_action_plans_risk_id_fkey,
    ADD CONSTRAINT nr1_action_plans_risk_id_tenant_fkey
        FOREIGN KEY (risk_id, tenant_id)
        REFERENCES public.nr1_risks (id, tenant_id)
        ON DELETE CASCADE;

ALTER TABLE public.nr1_activities
    DROP CONSTRAINT nr1_activities_department_id_fkey,
    ADD CONSTRAINT nr1_activities_department_id_tenant_fkey
        FOREIGN KEY (department_id, tenant_id)
        REFERENCES public.nr1_departments (id, tenant_id)
        ON DELETE CASCADE,
    DROP CONSTRAINT nr1_activities_establishment_id_fkey,
    ADD CONSTRAINT nr1_activities_establishment_id_tenant_fkey
        FOREIGN KEY (establishment_id, tenant_id)
        REFERENCES public.nr1_establishments (id, tenant_id)
        ON DELETE CASCADE;

ALTER TABLE public.nr1_audit_events
    DROP CONSTRAINT nr1_audit_events_establishment_id_fkey,
    ADD CONSTRAINT nr1_audit_events_establishment_id_tenant_fkey
        FOREIGN KEY (establishment_id, tenant_id)
        REFERENCES public.nr1_establishments (id, tenant_id)
        ON DELETE SET NULL (establishment_id);

ALTER TABLE public.nr1_company_contacts
    DROP CONSTRAINT nr1_company_contacts_company_id_fkey,
    ADD CONSTRAINT nr1_company_contacts_company_id_tenant_fkey
        FOREIGN KEY (company_id, tenant_id)
        REFERENCES public.nr1_companies (id, tenant_id)
        ON DELETE CASCADE;

ALTER TABLE public.nr1_departments
    DROP CONSTRAINT nr1_departments_establishment_id_fkey,
    ADD CONSTRAINT nr1_departments_establishment_id_tenant_fkey
        FOREIGN KEY (establishment_id, tenant_id)
        REFERENCES public.nr1_establishments (id, tenant_id)
        ON DELETE CASCADE;

ALTER TABLE public.nr1_diagnosis_accidents
    DROP CONSTRAINT nr1_diagnosis_accidents_diagnosis_session_id_fkey,
    ADD CONSTRAINT nr1_diagnosis_accidents_diagnosis_session_id_tenant_fkey
        FOREIGN KEY (diagnosis_session_id, tenant_id)
        REFERENCES public.nr1_diagnosis_sessions (id, tenant_id)
        ON DELETE CASCADE;

ALTER TABLE public.nr1_diagnosis_context
    DROP CONSTRAINT nr1_diagnosis_context_diagnosis_session_id_fkey,
    ADD CONSTRAINT nr1_diagnosis_context_diagnosis_session_id_tenant_fkey
        FOREIGN KEY (diagnosis_session_id, tenant_id)
        REFERENCES public.nr1_diagnosis_sessions (id, tenant_id)
        ON DELETE CASCADE;

ALTER TABLE public.nr1_diagnosis_controls
    DROP CONSTRAINT nr1_diagnosis_controls_diagnosis_session_id_fkey,
    ADD CONSTRAINT nr1_diagnosis_controls_diagnosis_session_id_tenant_fkey
        FOREIGN KEY (diagnosis_session_id, tenant_id)
        REFERENCES public.nr1_diagnosis_sessions (id, tenant_id)
        ON DELETE CASCADE;

ALTER TABLE public.nr1_diagnosis_ergonomics
    DROP CONSTRAINT nr1_diagnosis_ergonomics_diagnosis_session_id_fkey,
    ADD CONSTRAINT nr1_diagnosis_ergonomics_diagnosis_session_id_tenant_fkey
        FOREIGN KEY (diagnosis_session_id, tenant_id)
        REFERENCES public.nr1_diagnosis_sessions (id, tenant_id)
        ON DELETE CASCADE;

ALTER TABLE public.nr1_diagnosis_fqb
    DROP CONSTRAINT nr1_diagnosis_fqb_diagnosis_session_id_fkey,
    ADD CONSTRAINT nr1_diagnosis_fqb_diagnosis_session_id_tenant_fkey
        FOREIGN KEY (diagnosis_session_id, tenant_id)
        REFERENCES public.nr1_diagnosis_sessions (id, tenant_id)
        ON DELETE CASCADE;

ALTER TABLE public.nr1_diagnosis_psychosocial
    DROP CONSTRAINT nr1_diagnosis_psychosocial_diagnosis_session_id_fkey,
    ADD CONSTRAINT nr1_diagnosis_psychosocial_diagnosis_session_id_tenant_fkey
        FOREIGN KEY (diagnosis_session_id, tenant_id)
        REFERENCES public.nr1_diagnosis_sessions (id, tenant_id)
        ON DELETE CASCADE;

ALTER TABLE public.nr1_diagnosis_review
    DROP CONSTRAINT nr1_diagnosis_review_diagnosis_session_id_fkey,
    ADD CONSTRAINT nr1_diagnosis_review_diagnosis_session_id_tenant_fkey
        FOREIGN KEY (diagnosis_session_id, tenant_id)
        REFERENCES public.nr1_diagnosis_sessions (id, tenant_id)
        ON DELETE CASCADE;

ALTER TABLE public.nr1_diagnosis_sessions
    DROP CONSTRAINT nr1_diagnosis_sessions_activity_id_fkey,
    ADD CONSTRAINT nr1_diagnosis_sessions_activity_id_tenant_fkey
        FOREIGN KEY (activity_id, tenant_id)
        REFERENCES public.nr1_activities (id, tenant_id)
        ON DELETE CASCADE,
    DROP CONSTRAINT nr1_diagnosis_sessions_department_id_fkey,
    ADD CONSTRAINT nr1_diagnosis_sessions_department_id_tenant_fkey
        FOREIGN KEY (department_id, tenant_id)
        REFERENCES public.nr1_departments (id, tenant_id)
        ON DELETE CASCADE,
    DROP CONSTRAINT nr1_diagnosis_sessions_establishment_id_fkey,
    ADD CONSTRAINT nr1_diagnosis_sessions_establishment_id_tenant_fkey
        FOREIGN KEY (establishment_id, tenant_id)
        REFERENCES public.nr1_establishments (id, tenant_id)
        ON DELETE CASCADE;

ALTER TABLE public.nr1_document_versions
    DROP CONSTRAINT nr1_document_versions_establishment_id_fkey,
    ADD CONSTRAINT nr1_document_versions_establishment_id_tenant_fkey
        FOREIGN KEY (establishment_id, tenant_id)
        REFERENCES public.nr1_establishments (id, tenant_id)
        ON DELETE CASCADE,
    DROP CONSTRAINT nr1_document_versions_supersedes_document_id_fkey,
    ADD CONSTRAINT nr1_document_versions_supersedes_document_id_tenant_fkey
        FOREIGN KEY (supersedes_document_id, tenant_id)
        REFERENCES public.nr1_document_versions (id, tenant_id)
        ON DELETE SET NULL (supersedes_document_id);

ALTER TABLE public.nr1_draft_state
    DROP CONSTRAINT nr1_draft_state_establishment_id_fkey,
    ADD CONSTRAINT nr1_draft_state_establishment_id_tenant_fkey
        FOREIGN KEY (establishment_id, tenant_id)
        REFERENCES public.nr1_establishments (id, tenant_id)
        ON DELETE SET NULL (establishment_id);

ALTER TABLE public.nr1_establishments
    DROP CONSTRAINT nr1_establishments_company_id_fkey,
    ADD CONSTRAINT nr1_establishments_company_id_tenant_fkey
        FOREIGN KEY (company_id, tenant_id)
        REFERENCES public.nr1_companies (id, tenant_id)
        ON DELETE CASCADE;

ALTER TABLE public.nr1_evidence_items
    DROP CONSTRAINT nr1_evidence_items_establishment_id_fkey,
    ADD CONSTRAINT nr1_evidence_items_establishment_id_tenant_fkey
        FOREIGN KEY (establishment_id, tenant_id)
        REFERENCES public.nr1_establishments (id, tenant_id)
        ON DELETE CASCADE;

ALTER TABLE public.nr1_gro_criteria
    DROP CONSTRAINT nr1_gro_criteria_establishment_id_fkey,
    ADD CONSTRAINT nr1_gro_criteria_establishment_id_tenant_fkey
        FOREIGN KEY (establishment_id, tenant_id)
        REFERENCES public.nr1_establishments (id, tenant_id)
        ON DELETE CASCADE;

ALTER TABLE public.nr1_occupational_health_refs
    DROP CONSTRAINT nr1_occupational_health_refs_establishment_id_fkey,
    ADD CONSTRAINT nr1_occupational_health_refs_establishment_id_tenant_fkey
        FOREIGN KEY (establishment_id, tenant_id)
        REFERENCES public.nr1_establishments (id, tenant_id)
        ON DELETE CASCADE;

-- nr1_pgr_approvals intentionally keeps its existing FK and
-- validation trigger, which additionally validates establishment_id.

ALTER TABLE public.nr1_review_cycles
    DROP CONSTRAINT nr1_review_cycles_establishment_id_fkey,
    ADD CONSTRAINT nr1_review_cycles_establishment_id_tenant_fkey
        FOREIGN KEY (establishment_id, tenant_id)
        REFERENCES public.nr1_establishments (id, tenant_id)
        ON DELETE CASCADE;

ALTER TABLE public.nr1_risks
    DROP CONSTRAINT nr1_risks_activity_id_fkey,
    ADD CONSTRAINT nr1_risks_activity_id_tenant_fkey
        FOREIGN KEY (activity_id, tenant_id)
        REFERENCES public.nr1_activities (id, tenant_id)
        ON DELETE CASCADE,
    DROP CONSTRAINT nr1_risks_department_id_fkey,
    ADD CONSTRAINT nr1_risks_department_id_tenant_fkey
        FOREIGN KEY (department_id, tenant_id)
        REFERENCES public.nr1_departments (id, tenant_id)
        ON DELETE CASCADE,
    DROP CONSTRAINT nr1_risks_diagnosis_session_id_fkey,
    ADD CONSTRAINT nr1_risks_diagnosis_session_id_tenant_fkey
        FOREIGN KEY (diagnosis_session_id, tenant_id)
        REFERENCES public.nr1_diagnosis_sessions (id, tenant_id)
        ON DELETE SET NULL (diagnosis_session_id),
    DROP CONSTRAINT nr1_risks_establishment_id_fkey,
    ADD CONSTRAINT nr1_risks_establishment_id_tenant_fkey
        FOREIGN KEY (establishment_id, tenant_id)
        REFERENCES public.nr1_establishments (id, tenant_id)
        ON DELETE CASCADE;

ALTER TABLE public.nr1_third_parties
    DROP CONSTRAINT nr1_third_parties_establishment_id_fkey,
    ADD CONSTRAINT nr1_third_parties_establishment_id_tenant_fkey
        FOREIGN KEY (establishment_id, tenant_id)
        REFERENCES public.nr1_establishments (id, tenant_id)
        ON DELETE CASCADE;

ALTER TABLE public.nr1_training_records
    DROP CONSTRAINT nr1_training_records_establishment_id_fkey,
    ADD CONSTRAINT nr1_training_records_establishment_id_tenant_fkey
        FOREIGN KEY (establishment_id, tenant_id)
        REFERENCES public.nr1_establishments (id, tenant_id)
        ON DELETE CASCADE;

ALTER TABLE public.nr1_worker_participation_logs
    DROP CONSTRAINT nr1_worker_participation_logs_establishment_id_fkey,
    ADD CONSTRAINT nr1_worker_participation_logs_establishment_id_tenant_fkey
        FOREIGN KEY (establishment_id, tenant_id)
        REFERENCES public.nr1_establishments (id, tenant_id)
        ON DELETE CASCADE;

ALTER TABLE public.user_access_scope
    DROP CONSTRAINT user_access_scope_department_id_fkey,
    ADD CONSTRAINT user_access_scope_department_id_tenant_fkey
        FOREIGN KEY (department_id, tenant_id)
        REFERENCES public.nr1_departments (id, tenant_id)
        ON DELETE SET NULL (department_id),
    DROP CONSTRAINT user_access_scope_establishment_id_fkey,
    ADD CONSTRAINT user_access_scope_establishment_id_tenant_fkey
        FOREIGN KEY (establishment_id, tenant_id)
        REFERENCES public.nr1_establishments (id, tenant_id)
        ON DELETE SET NULL (establishment_id);