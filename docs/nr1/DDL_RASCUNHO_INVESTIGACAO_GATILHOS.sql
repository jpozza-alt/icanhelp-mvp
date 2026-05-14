-- DDL RASCUNHO - INVESTIGACAO DE GATILHOS NR1
-- Projeto: icanHelp NR1
-- Status: RASCUNHO LOCAL
-- Importante:
-- Este arquivo NAO deve ser executado automaticamente.
-- Este arquivo foi criado para revisao tecnica antes de virar migration.
-- Regra de produto:
-- Gatilho nao fecha risco.
-- Gatilho abre investigacao.
-- Investigacao gera sugestao.
-- Sugestao sensivel exige validacao tecnica.

-- ============================================================
-- TABELA 1: nr1_trigger_investigations
-- ============================================================

CREATE TABLE IF NOT EXISTS public.nr1_trigger_investigations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    establishment_id uuid NOT NULL REFERENCES public.nr1_establishments(id) ON DELETE CASCADE,
    department_id uuid NULL REFERENCES public.nr1_departments(id) ON DELETE SET NULL,
    activity_id uuid NULL REFERENCES public.nr1_activities(id) ON DELETE SET NULL,
    diagnosis_session_id uuid NULL REFERENCES public.nr1_diagnosis_sessions(id) ON DELETE SET NULL,

    trigger_type text NOT NULL,
    trigger_label text NOT NULL,

    investigation_status text NOT NULL DEFAULT 'not_started',

    initial_answer text NULL,
    official_message_shown boolean NOT NULL DEFAULT false,

    intensity text NULL,
    frequency text NULL,
    duration text NULL,
    exposed_people_count integer NULL,

    existing_controls text NULL,
    controls_effectiveness text NULL,
    evidence_status text NULL,
    possible_harms text NULL,

    answers_json jsonb NOT NULL DEFAULT '{}'::jsonb,

    suggested_result text NULL,
    suggested_severity text NULL,
    suggested_probability text NULL,
    suggested_priority text NULL,

    technical_validation_required boolean NOT NULL DEFAULT false,
    critical_alert_required boolean NOT NULL DEFAULT false,

    generated_risk_id uuid NULL REFERENCES public.nr1_risks(id) ON DELETE SET NULL,
    generated_action_plan_id uuid NULL REFERENCES public.nr1_action_plans(id) ON DELETE SET NULL,

    review_notes text NULL,

    created_at timestamp with time zone NOT NULL DEFAULT now(),
    created_by uuid NULL DEFAULT auth.uid(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_by uuid NULL DEFAULT auth.uid(),

    completed_at timestamp with time zone NULL,
    completed_by uuid NULL,

    reviewed_at timestamp with time zone NULL,
    reviewed_by uuid NULL,

    deleted_at timestamp with time zone NULL,
    deleted_by uuid NULL,

    CONSTRAINT nr1_trigger_investigations_trigger_type_check
        CHECK (trigger_type IN (
            'deadline_pressure',
            'public_service',
            'remote_or_hybrid_work',
            'third_parties',
            'repetitive_work',
            'prolonged_sitting',
            'intermediate_leadership',
            'frequent_changes',
            'task_accumulation',
            'frequent_conflicts',
            'harassment_or_violence'
        )),

    CONSTRAINT nr1_trigger_investigations_status_check
        CHECK (investigation_status IN (
            'not_started',
            'in_investigation',
            'saved_draft',
            'completed',
            'no_relevant_indication',
            'attention_point',
            'possible_risk_factor',
            'suggested_risk',
            'pending_technical_validation',
            'critical_alert',
            'converted_to_risk',
            'archived'
        )),

    CONSTRAINT nr1_trigger_investigations_exposed_people_nonnegative_check
        CHECK (exposed_people_count IS NULL OR exposed_people_count >= 0)
);

-- ============================================================
-- TABELA 2: nr1_trigger_investigation_answers
-- ============================================================

CREATE TABLE IF NOT EXISTS public.nr1_trigger_investigation_answers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    trigger_investigation_id uuid NOT NULL REFERENCES public.nr1_trigger_investigations(id) ON DELETE CASCADE,

    question_key text NOT NULL,
    question_label text NOT NULL,
    answer_value text NULL,
    answer_json jsonb NOT NULL DEFAULT '{}'::jsonb,

    answer_order integer NOT NULL DEFAULT 0,
    is_required boolean NOT NULL DEFAULT false,

    created_at timestamp with time zone NOT NULL DEFAULT now(),
    created_by uuid NULL DEFAULT auth.uid(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_by uuid NULL DEFAULT auth.uid(),

    deleted_at timestamp with time zone NULL,
    deleted_by uuid NULL,

    CONSTRAINT nr1_trigger_investigation_answers_order_nonnegative_check
        CHECK (answer_order >= 0)
);

-- ============================================================
-- INDICES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_nr1_trigger_investigations_tenant_id
    ON public.nr1_trigger_investigations (tenant_id);

CREATE INDEX IF NOT EXISTS idx_nr1_trigger_investigations_establishment_id
    ON public.nr1_trigger_investigations (establishment_id);

CREATE INDEX IF NOT EXISTS idx_nr1_trigger_investigations_department_id
    ON public.nr1_trigger_investigations (department_id);

CREATE INDEX IF NOT EXISTS idx_nr1_trigger_investigations_activity_id
    ON public.nr1_trigger_investigations (activity_id);

CREATE INDEX IF NOT EXISTS idx_nr1_trigger_investigations_diagnosis_session_id
    ON public.nr1_trigger_investigations (diagnosis_session_id);

CREATE INDEX IF NOT EXISTS idx_nr1_trigger_investigations_status
    ON public.nr1_trigger_investigations (investigation_status);

CREATE INDEX IF NOT EXISTS idx_nr1_trigger_investigations_trigger_type
    ON public.nr1_trigger_investigations (trigger_type);

CREATE INDEX IF NOT EXISTS idx_nr1_trigger_investigations_pending_validation
    ON public.nr1_trigger_investigations (tenant_id, technical_validation_required, critical_alert_required)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_nr1_trigger_investigation_answers_tenant_id
    ON public.nr1_trigger_investigation_answers (tenant_id);

CREATE INDEX IF NOT EXISTS idx_nr1_trigger_investigation_answers_investigation_id
    ON public.nr1_trigger_investigation_answers (trigger_investigation_id);

CREATE INDEX IF NOT EXISTS idx_nr1_trigger_investigation_answers_question_key
    ON public.nr1_trigger_investigation_answers (question_key);

-- ============================================================
-- UPDATED_AT TRIGGER
-- Observacao:
-- Validar no schema real se ja existe funcao padrao para updated_at.
-- Se existir, reaproveitar antes de executar qualquer migration.
-- ============================================================

-- CREATE TRIGGER trg_nr1_trigger_investigations_updated_at
-- BEFORE UPDATE ON public.nr1_trigger_investigations
-- FOR EACH ROW
-- EXECUTE FUNCTION public.set_updated_at();

-- CREATE TRIGGER trg_nr1_trigger_investigation_answers_updated_at
-- BEFORE UPDATE ON public.nr1_trigger_investigation_answers
-- FOR EACH ROW
-- EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- RLS
-- ============================================================

ALTER TABLE public.nr1_trigger_investigations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nr1_trigger_investigation_answers ENABLE ROW LEVEL SECURITY;

-- Opcional:
-- Avaliar se deve usar FORCE ROW LEVEL SECURITY conforme padrao real das tabelas NR1.
-- ALTER TABLE public.nr1_trigger_investigations FORCE ROW LEVEL SECURITY;
-- ALTER TABLE public.nr1_trigger_investigation_answers FORCE ROW LEVEL SECURITY;

-- ============================================================
-- POLICIES - nr1_trigger_investigations
-- Padrao: usuario autenticado acessa registros do tenant onde tem membership.
-- ============================================================

CREATE POLICY "nr1_trigger_investigations_select_by_tenant_membership"
ON public.nr1_trigger_investigations
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.tenant_memberships tm
        WHERE tm.tenant_id = nr1_trigger_investigations.tenant_id
          AND tm.user_id = auth.uid()
    )
);

CREATE POLICY "nr1_trigger_investigations_insert_by_tenant_membership"
ON public.nr1_trigger_investigations
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.tenant_memberships tm
        WHERE tm.tenant_id = nr1_trigger_investigations.tenant_id
          AND tm.user_id = auth.uid()
    )
);

CREATE POLICY "nr1_trigger_investigations_update_by_tenant_membership"
ON public.nr1_trigger_investigations
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.tenant_memberships tm
        WHERE tm.tenant_id = nr1_trigger_investigations.tenant_id
          AND tm.user_id = auth.uid()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.tenant_memberships tm
        WHERE tm.tenant_id = nr1_trigger_investigations.tenant_id
          AND tm.user_id = auth.uid()
    )
);

-- Exclusao fisica nao recomendada.
-- Preferir deleted_at/deleted_by.
-- Nao criar policy DELETE sem decisao tecnica.

-- ============================================================
-- POLICIES - nr1_trigger_investigation_answers
-- ============================================================

CREATE POLICY "nr1_trigger_investigation_answers_select_by_tenant_membership"
ON public.nr1_trigger_investigation_answers
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.tenant_memberships tm
        WHERE tm.tenant_id = nr1_trigger_investigation_answers.tenant_id
          AND tm.user_id = auth.uid()
    )
);

CREATE POLICY "nr1_trigger_investigation_answers_insert_by_tenant_membership"
ON public.nr1_trigger_investigation_answers
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.tenant_memberships tm
        WHERE tm.tenant_id = nr1_trigger_investigation_answers.tenant_id
          AND tm.user_id = auth.uid()
    )
);

CREATE POLICY "nr1_trigger_investigation_answers_update_by_tenant_membership"
ON public.nr1_trigger_investigation_answers
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.tenant_memberships tm
        WHERE tm.tenant_id = nr1_trigger_investigation_answers.tenant_id
          AND tm.user_id = auth.uid()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.tenant_memberships tm
        WHERE tm.tenant_id = nr1_trigger_investigation_answers.tenant_id
          AND tm.user_id = auth.uid()
    )
);

-- ============================================================
-- AUDITORIA
-- ============================================================
-- Eventos esperados para uso em nr1_audit_events:
-- trigger_marked_yes
-- official_message_shown
-- trigger_investigation_started
-- trigger_question_answered
-- trigger_investigation_saved
-- trigger_investigation_completed
-- trigger_result_suggested
-- technical_validation_required
-- critical_alert_generated
-- investigation_converted_to_risk
-- investigation_archived
-- investigation_reopened

-- ============================================================
-- OBSERVACOES DE REVISAO ANTES DE VIRAR MIGRATION
-- ============================================================
-- 1. Confirmar padrao real de nomes de policies no banco.
-- 2. Confirmar se tabelas NR1 atuais usam FORCE ROW LEVEL SECURITY.
-- 3. Confirmar funcao padrao de updated_at.
-- 4. Confirmar se FK para activity deve ser activity_id ou work_activity_id.
-- 5. Confirmar se generated_action_plan_id deve apontar para item ou plano.
-- 6. Confirmar se answers_json sera mantido junto com tabela normalizada de respostas.
-- 7. Confirmar se archived/deleted_at seguira padrao das tabelas existentes.
-- 8. Confirmar se roles owner/admin/member/viewer exigem restricoes diferentes por escrita.
