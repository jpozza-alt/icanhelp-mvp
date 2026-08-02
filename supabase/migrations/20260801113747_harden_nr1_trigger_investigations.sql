-- icanHelp NR-1
-- Corrective migration candidate for trigger investigations.
-- This file must be reviewed before any database execution.

BEGIN;

-- Abort if current data would violate the proposed guarantees.

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM public.nr1_trigger_investigation_answers AS answer
        JOIN public.nr1_trigger_investigations AS investigation
          ON investigation.id = answer.trigger_investigation_id
        WHERE answer.tenant_id <> investigation.tenant_id
    ) THEN
        RAISE EXCEPTION
            'Cross-tenant answer-to-investigation reference detected';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM public.nr1_trigger_investigations AS investigation
        JOIN public.nr1_establishments AS establishment
          ON establishment.id = investigation.establishment_id
        WHERE investigation.tenant_id <> establishment.tenant_id
    ) THEN
        RAISE EXCEPTION
            'Cross-tenant establishment reference detected';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM public.nr1_trigger_investigations AS investigation
        JOIN public.nr1_departments AS department
          ON department.id = investigation.department_id
        WHERE investigation.department_id IS NOT NULL
          AND investigation.tenant_id <> department.tenant_id
    ) THEN
        RAISE EXCEPTION
            'Cross-tenant department reference detected';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM public.nr1_trigger_investigations AS investigation
        JOIN public.nr1_activities AS activity
          ON activity.id = investigation.activity_id
        WHERE investigation.activity_id IS NOT NULL
          AND investigation.tenant_id <> activity.tenant_id
    ) THEN
        RAISE EXCEPTION
            'Cross-tenant activity reference detected';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM public.nr1_trigger_investigations AS investigation
        JOIN public.nr1_diagnosis_sessions AS diagnosis
          ON diagnosis.id = investigation.diagnosis_session_id
        WHERE investigation.diagnosis_session_id IS NOT NULL
          AND investigation.tenant_id <> diagnosis.tenant_id
    ) THEN
        RAISE EXCEPTION
            'Cross-tenant diagnosis session reference detected';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM public.nr1_trigger_investigations AS investigation
        JOIN public.nr1_risks AS risk
          ON risk.id = investigation.generated_risk_id
        WHERE investigation.generated_risk_id IS NOT NULL
          AND investigation.tenant_id <> risk.tenant_id
    ) THEN
        RAISE EXCEPTION
            'Cross-tenant generated risk reference detected';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM public.nr1_trigger_investigations AS investigation
        JOIN public.nr1_action_plans AS action_plan
          ON action_plan.id = investigation.generated_action_plan_id
        WHERE investigation.generated_action_plan_id IS NOT NULL
          AND investigation.tenant_id <> action_plan.tenant_id
    ) THEN
        RAISE EXCEPTION
            'Cross-tenant generated action plan reference detected';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM public.nr1_trigger_investigation_answers
        WHERE deleted_at IS NULL
        GROUP BY tenant_id, trigger_investigation_id, question_key
        HAVING count(*) > 1
    ) THEN
        RAISE EXCEPTION
            'Duplicate active answers detected';
    END IF;

    IF to_regprocedure(
        'public.icanhelp_nr1_touch_updated_at()'
    ) IS NULL THEN
        RAISE EXCEPTION
            'Required updated_at function was not found';
    END IF;
END
$$;

-- Composite unique indexes support tenant-aware foreign keys.

CREATE UNIQUE INDEX IF NOT EXISTS
    ux_nr1_establishments_id_tenant
ON public.nr1_establishments (id, tenant_id);

CREATE UNIQUE INDEX IF NOT EXISTS
    ux_nr1_departments_id_tenant
ON public.nr1_departments (id, tenant_id);

CREATE UNIQUE INDEX IF NOT EXISTS
    ux_nr1_activities_id_tenant
ON public.nr1_activities (id, tenant_id);

CREATE UNIQUE INDEX IF NOT EXISTS
    ux_nr1_risks_id_tenant
ON public.nr1_risks (id, tenant_id);

CREATE UNIQUE INDEX IF NOT EXISTS
    ux_nr1_action_plans_id_tenant
ON public.nr1_action_plans (id, tenant_id);

CREATE UNIQUE INDEX IF NOT EXISTS
    ux_nr1_trigger_investigations_id_tenant
ON public.nr1_trigger_investigations (id, tenant_id);

-- Prevent more than one active answer for the same investigation question.

CREATE UNIQUE INDEX IF NOT EXISTS
    ux_nr1_trigger_answer_active_question
ON public.nr1_trigger_investigation_answers (
    tenant_id,
    trigger_investigation_id,
    question_key
)
WHERE deleted_at IS NULL;

-- Tenant-aware relationships.
-- Existing single-column foreign keys are preserved for later review.

ALTER TABLE public.nr1_trigger_investigations
    ADD CONSTRAINT fk_nr1_ti_est_tenant
    FOREIGN KEY (establishment_id, tenant_id)
    REFERENCES public.nr1_establishments (id, tenant_id)
    ON DELETE CASCADE
    NOT VALID;

ALTER TABLE public.nr1_trigger_investigations
    ADD CONSTRAINT fk_nr1_ti_dep_tenant
    FOREIGN KEY (department_id, tenant_id)
    REFERENCES public.nr1_departments (id, tenant_id)
    ON DELETE SET NULL (department_id)
    NOT VALID;

ALTER TABLE public.nr1_trigger_investigations
    ADD CONSTRAINT fk_nr1_ti_activity_tenant
    FOREIGN KEY (activity_id, tenant_id)
    REFERENCES public.nr1_activities (id, tenant_id)
    ON DELETE SET NULL (activity_id)
    NOT VALID;

ALTER TABLE public.nr1_trigger_investigations
    ADD CONSTRAINT fk_nr1_ti_diagnosis_tenant
    FOREIGN KEY (diagnosis_session_id, tenant_id)
    REFERENCES public.nr1_diagnosis_sessions (id, tenant_id)
    ON DELETE SET NULL (diagnosis_session_id)
    NOT VALID;

ALTER TABLE public.nr1_trigger_investigations
    ADD CONSTRAINT fk_nr1_ti_risk_tenant
    FOREIGN KEY (generated_risk_id, tenant_id)
    REFERENCES public.nr1_risks (id, tenant_id)
    ON DELETE SET NULL (generated_risk_id)
    NOT VALID;

ALTER TABLE public.nr1_trigger_investigations
    ADD CONSTRAINT fk_nr1_ti_plan_tenant
    FOREIGN KEY (generated_action_plan_id, tenant_id)
    REFERENCES public.nr1_action_plans (id, tenant_id)
    ON DELETE SET NULL (generated_action_plan_id)
    NOT VALID;

ALTER TABLE public.nr1_trigger_investigation_answers
    ADD CONSTRAINT fk_nr1_tia_inv_tenant
    FOREIGN KEY (trigger_investigation_id, tenant_id)
    REFERENCES public.nr1_trigger_investigations (id, tenant_id)
    ON DELETE CASCADE
    NOT VALID;

ALTER TABLE public.nr1_trigger_investigations
    VALIDATE CONSTRAINT fk_nr1_ti_est_tenant;

ALTER TABLE public.nr1_trigger_investigations
    VALIDATE CONSTRAINT fk_nr1_ti_dep_tenant;

ALTER TABLE public.nr1_trigger_investigations
    VALIDATE CONSTRAINT fk_nr1_ti_activity_tenant;

ALTER TABLE public.nr1_trigger_investigations
    VALIDATE CONSTRAINT fk_nr1_ti_diagnosis_tenant;

ALTER TABLE public.nr1_trigger_investigations
    VALIDATE CONSTRAINT fk_nr1_ti_risk_tenant;

ALTER TABLE public.nr1_trigger_investigations
    VALIDATE CONSTRAINT fk_nr1_ti_plan_tenant;

ALTER TABLE public.nr1_trigger_investigation_answers
    VALIDATE CONSTRAINT fk_nr1_tia_inv_tenant;

-- Maintain updated_at automatically.

DROP TRIGGER IF EXISTS
    trg_nr1_trigger_investigations_updated_at
ON public.nr1_trigger_investigations;

CREATE TRIGGER trg_nr1_trigger_investigations_updated_at
BEFORE UPDATE ON public.nr1_trigger_investigations
FOR EACH ROW
EXECUTE FUNCTION public.icanhelp_nr1_touch_updated_at();

DROP TRIGGER IF EXISTS
    trg_nr1_trigger_investigation_answers_updated_at
ON public.nr1_trigger_investigation_answers;

CREATE TRIGGER trg_nr1_trigger_investigation_answers_updated_at
BEFORE UPDATE ON public.nr1_trigger_investigation_answers
FOR EACH ROW
EXECUTE FUNCTION public.icanhelp_nr1_touch_updated_at();

-- Preserve the confirmed RLS enforcement state.

ALTER TABLE public.nr1_trigger_investigations
    ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.nr1_trigger_investigations
    FORCE ROW LEVEL SECURITY;

ALTER TABLE public.nr1_trigger_investigation_answers
    ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.nr1_trigger_investigation_answers
    FORCE ROW LEVEL SECURITY;

COMMIT;