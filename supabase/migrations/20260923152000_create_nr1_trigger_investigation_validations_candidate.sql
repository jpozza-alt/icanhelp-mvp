-- icanHelp NR-1
-- CANDIDATE MIGRATION - trigger investigation validations
-- Date: 2026-09-23
--
-- IMPORTANT:
-- This file is a LOCAL CANDIDATE.
-- Do not execute against production automatically.
--
-- Official flow:
-- trigger
-- -> investigation
-- -> answers
-- -> suggested result
-- -> human validation
-- -> technical validation when required
-- -> explicit risk conversion
--
-- Validation never creates a risk automatically.

BEGIN;

-- ============================================================
-- 1. PRECONDITIONS / TENANT-AWARE CANDIDATE KEYS
-- ============================================================

DO $$
BEGIN
    IF to_regclass(
        'public.nr1_trigger_investigations'
    ) IS NULL THEN
        RAISE EXCEPTION
            'Required table public.nr1_trigger_investigations was not found';
    END IF;

    IF to_regclass(
        'public.nr1_establishments'
    ) IS NULL THEN
        RAISE EXCEPTION
            'Required table public.nr1_establishments was not found';
    END IF;

    IF to_regprocedure(
        'public.icanhelp_nr1_touch_updated_at()'
    ) IS NULL THEN
        RAISE EXCEPTION
            'Required function public.icanhelp_nr1_touch_updated_at() was not found';
    END IF;
END
$$;

-- The investigation id is already unique by itself, but this composite
-- candidate key allows one FK to guarantee investigation + tenant +
-- establishment consistency in the validation table.

CREATE UNIQUE INDEX IF NOT EXISTS
    ux_nr1_trigger_investigations_id_tenant_establishment
ON public.nr1_trigger_investigations (
    id,
    tenant_id,
    establishment_id
);

-- ============================================================
-- 2. VALIDATION TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS
    public.nr1_trigger_investigation_validations
(
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    tenant_id uuid NOT NULL
        REFERENCES public.tenants(id)
        ON DELETE CASCADE,

    establishment_id uuid NOT NULL,

    trigger_investigation_id uuid NOT NULL,

    validation_type text NOT NULL,

    validation_status text NOT NULL
        DEFAULT 'pending',

    decision_type text NULL,

    suggested_result_snapshot text NULL,

    validated_result text NULL,

    notes text NULL,

    validator_user_id uuid NULL
        REFERENCES auth.users(id),

    professional_name text NULL,
    professional_role text NULL,
    professional_council text NULL,
    professional_registration text NULL,
    professional_state text NULL,

    source_snapshot_json jsonb NOT NULL
        DEFAULT '{}'::jsonb,

    validated_at timestamptz NULL,

    created_at timestamptz NOT NULL
        DEFAULT now(),

    created_by uuid NULL
        DEFAULT auth.uid()
        REFERENCES auth.users(id),

    updated_at timestamptz NOT NULL
        DEFAULT now(),

    updated_by uuid NULL
        DEFAULT auth.uid()
        REFERENCES auth.users(id),

    revoked_at timestamptz NULL,

    revoked_by uuid NULL
        REFERENCES auth.users(id),

    revocation_reason text NULL,

    CONSTRAINT nr1_tiv_validation_type_check
        CHECK (
            validation_type IN (
                'human',
                'technical'
            )
        ),

    CONSTRAINT nr1_tiv_validation_status_check
        CHECK (
            validation_status IN (
                'pending',
                'validated',
                'rejected',
                'needs_more_information',
                'revoked'
            )
        ),

    CONSTRAINT nr1_tiv_decision_type_check
        CHECK (
            decision_type IS NULL
            OR decision_type IN (
                'confirm_result',
                'adjust_result',
                'reject_result',
                'request_more_information'
            )
        ),

    CONSTRAINT nr1_tiv_suggested_result_snapshot_check
        CHECK (
            suggested_result_snapshot IS NULL
            OR suggested_result_snapshot IN (
                'no_relevant_indication',
                'attention_point',
                'possible_risk_factor',
                'suggested_risk'
            )
        ),

    CONSTRAINT nr1_tiv_validated_result_check
        CHECK (
            validated_result IS NULL
            OR validated_result IN (
                'no_relevant_indication',
                'attention_point',
                'possible_risk_factor',
                'suggested_risk'
            )
        ),

    CONSTRAINT nr1_tiv_adjust_requires_result_check
        CHECK (
            decision_type <> 'adjust_result'
            OR decision_type IS NULL
            OR validated_result IS NOT NULL
        ),

    CONSTRAINT nr1_tiv_pending_has_no_decision_check
        CHECK (
            validation_status <> 'pending'
            OR decision_type IS NULL
        ),

    CONSTRAINT nr1_tiv_validated_requires_decision_check
        CHECK (
            validation_status <> 'validated'
            OR decision_type IN (
                'confirm_result',
                'adjust_result'
            )
        ),

    CONSTRAINT nr1_tiv_confirm_result_consistency_check
        CHECK (
            decision_type <> 'confirm_result'
            OR (
                suggested_result_snapshot IS NOT NULL
                AND validated_result = suggested_result_snapshot
            )
        ),

    CONSTRAINT nr1_tiv_adjust_result_consistency_check
        CHECK (
            decision_type <> 'adjust_result'
            OR (
                suggested_result_snapshot IS NOT NULL
                AND validated_result IS NOT NULL
            )
        ),

    CONSTRAINT nr1_tiv_non_result_decision_check
        CHECK (
            decision_type NOT IN (
                'reject_result',
                'request_more_information'
            )
            OR validated_result IS NULL
        ),

    CONSTRAINT nr1_tiv_rejected_requires_decision_check
        CHECK (
            validation_status <> 'rejected'
            OR decision_type = 'reject_result'
        ),

    CONSTRAINT nr1_tiv_more_info_requires_decision_check
        CHECK (
            validation_status <> 'needs_more_information'
            OR decision_type = 'request_more_information'
        ),

    CONSTRAINT nr1_tiv_finalized_requires_validated_at_check
        CHECK (
            validation_status NOT IN (
                'validated',
                'rejected',
                'needs_more_information'
            )
            OR validated_at IS NOT NULL
        ),

    CONSTRAINT nr1_tiv_revoked_fields_check
        CHECK (
            validation_status <> 'revoked'
            OR revoked_at IS NOT NULL
        ),

    CONSTRAINT nr1_tiv_professional_state_check
        CHECK (
            professional_state IS NULL
            OR professional_state ~ '^[A-Z]{2}$'
        )
);

-- ============================================================
-- 3. TENANT-AWARE FOREIGN KEYS
-- ============================================================

ALTER TABLE public.nr1_trigger_investigation_validations
    ADD CONSTRAINT fk_nr1_tiv_investigation_scope
    FOREIGN KEY (
        trigger_investigation_id,
        tenant_id,
        establishment_id
    )
    REFERENCES public.nr1_trigger_investigations (
        id,
        tenant_id,
        establishment_id
    )
    ON DELETE CASCADE
    NOT VALID;

ALTER TABLE public.nr1_trigger_investigation_validations
    ADD CONSTRAINT fk_nr1_tiv_establishment_tenant
    FOREIGN KEY (
        establishment_id,
        tenant_id
    )
    REFERENCES public.nr1_establishments (
        id,
        tenant_id
    )
    ON DELETE CASCADE
    NOT VALID;

ALTER TABLE public.nr1_trigger_investigation_validations
    VALIDATE CONSTRAINT
        fk_nr1_tiv_investigation_scope;

ALTER TABLE public.nr1_trigger_investigation_validations
    VALIDATE CONSTRAINT
        fk_nr1_tiv_establishment_tenant;

-- ============================================================
-- 4. INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS
    idx_nr1_tiv_tenant
ON public.nr1_trigger_investigation_validations (
    tenant_id
);

CREATE INDEX IF NOT EXISTS
    idx_nr1_tiv_establishment
ON public.nr1_trigger_investigation_validations (
    tenant_id,
    establishment_id
);

CREATE INDEX IF NOT EXISTS
    idx_nr1_tiv_investigation
ON public.nr1_trigger_investigation_validations (
    tenant_id,
    trigger_investigation_id
);

CREATE INDEX IF NOT EXISTS
    idx_nr1_tiv_status
ON public.nr1_trigger_investigation_validations (
    tenant_id,
    validation_status
);

CREATE INDEX IF NOT EXISTS
    idx_nr1_tiv_type_status
ON public.nr1_trigger_investigation_validations (
    tenant_id,
    trigger_investigation_id,
    validation_type,
    validation_status
);

-- Validation history is append-only.
-- More than one historical validation of the same type may exist.
-- The effective decision is the most recent non-revoked validation
-- for the investigation and validation type.
-- Previous decisions are preserved for audit purposes.

-- ============================================================
-- 5. HISTORY / IMMUTABILITY GUARD
-- ============================================================

CREATE OR REPLACE FUNCTION
    public.nr1_tiv_guard_history()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    -- Identity and scope never change after creation.

    IF NEW.id IS DISTINCT FROM OLD.id
       OR NEW.tenant_id IS DISTINCT FROM OLD.tenant_id
       OR NEW.establishment_id IS DISTINCT FROM OLD.establishment_id
       OR NEW.trigger_investigation_id IS DISTINCT FROM OLD.trigger_investigation_id
       OR NEW.validation_type IS DISTINCT FROM OLD.validation_type
       OR NEW.created_at IS DISTINCT FROM OLD.created_at
       OR NEW.created_by IS DISTINCT FROM OLD.created_by
    THEN
        RAISE EXCEPTION
            'Validation identity and scope fields are immutable';
    END IF;

    -- Pending validations may still be completed normally.

    IF OLD.validation_status = 'pending' THEN
        RETURN NEW;
    END IF;

    -- A revoked historical record cannot be changed again.

    IF OLD.validation_status = 'revoked' THEN
        RAISE EXCEPTION
            'Revoked validation records are immutable';
    END IF;

    -- A completed decision may only transition to revoked.

    IF NEW.validation_status <> 'revoked' THEN
        RAISE EXCEPTION
            'Completed validation records can only be revoked';
    END IF;

    -- Revocation must preserve the original decision.

    IF NEW.decision_type IS DISTINCT FROM OLD.decision_type
       OR NEW.suggested_result_snapshot IS DISTINCT FROM OLD.suggested_result_snapshot
       OR NEW.validated_result IS DISTINCT FROM OLD.validated_result
       OR NEW.notes IS DISTINCT FROM OLD.notes
       OR NEW.validator_user_id IS DISTINCT FROM OLD.validator_user_id
       OR NEW.professional_name IS DISTINCT FROM OLD.professional_name
       OR NEW.professional_role IS DISTINCT FROM OLD.professional_role
       OR NEW.professional_council IS DISTINCT FROM OLD.professional_council
       OR NEW.professional_registration IS DISTINCT FROM OLD.professional_registration
       OR NEW.professional_state IS DISTINCT FROM OLD.professional_state
       OR NEW.source_snapshot_json IS DISTINCT FROM OLD.source_snapshot_json
       OR NEW.validated_at IS DISTINCT FROM OLD.validated_at
    THEN
        RAISE EXCEPTION
            'Revocation cannot rewrite the original validation decision';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS
    trg_nr1_tiv_guard_history
ON public.nr1_trigger_investigation_validations;

CREATE TRIGGER
    trg_nr1_tiv_guard_history
BEFORE UPDATE
ON public.nr1_trigger_investigation_validations
FOR EACH ROW
EXECUTE FUNCTION public.nr1_tiv_guard_history();

-- ============================================================
-- 6. UPDATED_AT
-- ============================================================

DROP TRIGGER IF EXISTS
    trg_nr1_trigger_investigation_validations_updated_at
ON public.nr1_trigger_investigation_validations;

CREATE TRIGGER
    trg_nr1_trigger_investigation_validations_updated_at
BEFORE UPDATE
ON public.nr1_trigger_investigation_validations
FOR EACH ROW
EXECUTE FUNCTION public.icanhelp_nr1_touch_updated_at();

-- ============================================================
-- 7. RLS
-- ============================================================

ALTER TABLE public.nr1_trigger_investigation_validations
    ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.nr1_trigger_investigation_validations
    FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS
    nr1_tiv_select_by_tenant_membership
ON public.nr1_trigger_investigation_validations;

DROP POLICY IF EXISTS
    nr1_tiv_insert_by_tenant_membership
ON public.nr1_trigger_investigation_validations;

DROP POLICY IF EXISTS
    nr1_tiv_update_by_tenant_membership
ON public.nr1_trigger_investigation_validations;

CREATE POLICY
    nr1_tiv_select_by_tenant_membership
ON public.nr1_trigger_investigation_validations
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.tenant_memberships tm
        WHERE tm.tenant_id =
            nr1_trigger_investigation_validations.tenant_id
          AND tm.user_id = auth.uid()
    )
);

CREATE POLICY
    nr1_tiv_insert_by_tenant_membership
ON public.nr1_trigger_investigation_validations
FOR INSERT
TO authenticated
WITH CHECK (
    public.is_tenant_admin(
        nr1_trigger_investigation_validations.tenant_id
    )
);

CREATE POLICY
    nr1_tiv_update_by_tenant_membership
ON public.nr1_trigger_investigation_validations
FOR UPDATE
TO authenticated
USING (
    public.is_tenant_admin(
        nr1_trigger_investigation_validations.tenant_id
    )
)
WITH CHECK (
    public.is_tenant_admin(
        nr1_trigger_investigation_validations.tenant_id
    )
);

-- Intentionally no DELETE policy.
-- Historical validation records should be preserved.
-- Revocation is explicit and auditable.

-- ============================================================
-- 8. DOCUMENTATION
-- ============================================================

COMMENT ON TABLE
    public.nr1_trigger_investigation_validations
IS
    'Historical human and technical validation decisions for NR1 trigger investigations. Validation does not automatically create occupational risks.';

COMMENT ON COLUMN
    public.nr1_trigger_investigation_validations.validation_type
IS
    'human or technical validation.';

COMMENT ON COLUMN
    public.nr1_trigger_investigation_validations.source_snapshot_json
IS
    'Immutable-at-decision snapshot used to preserve the context evaluated by the validator.';

COMMENT ON COLUMN
    public.nr1_trigger_investigation_validations.validated_result
IS
    'Result accepted or adjusted by the validation decision. It does not automatically create a risk.';

COMMIT;





