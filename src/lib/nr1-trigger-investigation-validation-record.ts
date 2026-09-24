import type {
  TriggerInvestigationSuggestedResult,
} from "./nr1-trigger-investigation-result-engine.ts"
import {
  resolveTriggerInvestigationValidation,
  type TriggerInvestigationValidationDecision,
  type TriggerInvestigationValidationStatus,
  type TriggerInvestigationValidationType,
} from "./nr1-trigger-investigation-validation.ts"

export type Nr1TriggerInvestigationValidationInsert = {
  tenant_id: string
  establishment_id: string
  trigger_investigation_id: string

  validation_type:
    TriggerInvestigationValidationType

  validation_status:
    TriggerInvestigationValidationStatus

  decision_type:
    TriggerInvestigationValidationDecision | null

  suggested_result_snapshot:
    TriggerInvestigationSuggestedResult | null

  validated_result:
    TriggerInvestigationSuggestedResult | null

  notes?: string | null

  validator_user_id?: string | null

  professional_name?: string | null
  professional_role?: string | null
  professional_council?: string | null
  professional_registration?: string | null
  professional_state?: string | null

  source_snapshot_json:
    Record<string, unknown>

  validated_at?: string | null

  created_by?: string | null
  updated_by?: string | null
}

export type Nr1TriggerInvestigationValidationRow =
  Nr1TriggerInvestigationValidationInsert & {
    id: string
    created_at: string
    updated_at: string

    revoked_at: string | null
    revoked_by: string | null
    revocation_reason: string | null
  }
export type BuildHumanValidationRecordInput = {
  tenantId: string
  establishmentId: string
  investigationId: string
  userId: string

  decision:
    TriggerInvestigationValidationDecision

  suggestedResult:
    TriggerInvestigationSuggestedResult

  adjustedResult?:
    TriggerInvestigationSuggestedResult | null

  notes?: string | null

  sourceSnapshot:
    Record<string, unknown>

  validatedAt?: string
}

export type BuildHumanValidationRecordResult = {
  record: Nr1TriggerInvestigationValidationInsert
  reopenInvestigation: boolean
}

export function buildHumanValidationRecord(
  input: BuildHumanValidationRecordInput,
): BuildHumanValidationRecordResult {
  const outcome =
    resolveTriggerInvestigationValidation({
      decision: input.decision,
      suggestedResult: input.suggestedResult,
      adjustedResult: input.adjustedResult,
    })

  return {
    record: {
      tenant_id: input.tenantId,
      establishment_id: input.establishmentId,
      trigger_investigation_id:
        input.investigationId,

      validation_type: "human",

      validation_status:
        outcome.validationStatus,

      decision_type:
        outcome.decisionType,

      suggested_result_snapshot:
        input.suggestedResult,

      validated_result:
        outcome.validatedResult,

      notes:
        input.notes?.trim() || null,

      validator_user_id:
        input.userId,

      professional_name: null,
      professional_role: null,
      professional_council: null,
      professional_registration: null,
      professional_state: null,

      source_snapshot_json:
        input.sourceSnapshot,

      validated_at:
        input.validatedAt ||
        new Date().toISOString(),

      created_by:
        input.userId,

      updated_by:
        input.userId,
    },

    reopenInvestigation:
      outcome.reopenInvestigation,
  }
}

export type BuildTechnicalValidationRecordInput = {
  tenantId: string
  establishmentId: string
  investigationId: string
  userId: string

  decision:
    TriggerInvestigationValidationDecision

  suggestedResult:
    TriggerInvestigationSuggestedResult

  adjustedResult?:
    TriggerInvestigationSuggestedResult | null

  notes?: string | null

  professionalName?: string | null
  professionalRole?: string | null
  professionalCouncil?: string | null
  professionalRegistration?: string | null
  professionalState?: string | null

  sourceSnapshot:
    Record<string, unknown>

  validatedAt?: string
}

export type BuildTechnicalValidationRecordResult = {
  record: Nr1TriggerInvestigationValidationInsert
  reopenInvestigation: boolean
}

export function buildTechnicalValidationRecord(
  input: BuildTechnicalValidationRecordInput,
): BuildTechnicalValidationRecordResult {
  const outcome =
    resolveTriggerInvestigationValidation({
      decision: input.decision,
      suggestedResult: input.suggestedResult,
      adjustedResult: input.adjustedResult,
    })

  return {
    record: {
      tenant_id: input.tenantId,
      establishment_id: input.establishmentId,
      trigger_investigation_id:
        input.investigationId,

      validation_type: "technical",

      validation_status:
        outcome.validationStatus,

      decision_type:
        outcome.decisionType,

      suggested_result_snapshot:
        input.suggestedResult,

      validated_result:
        outcome.validatedResult,

      notes:
        input.notes?.trim() || null,

      validator_user_id:
        input.userId,

      professional_name:
        input.professionalName?.trim() || null,

      professional_role:
        input.professionalRole?.trim() || null,

      professional_council:
        input.professionalCouncil?.trim() || null,

      professional_registration:
        input.professionalRegistration?.trim() || null,

      professional_state:
        input.professionalState?.trim().toUpperCase() ||
        null,

      source_snapshot_json:
        input.sourceSnapshot,

      validated_at:
        input.validatedAt ||
        new Date().toISOString(),

      created_by:
        input.userId,

      updated_by:
        input.userId,
    },

    reopenInvestigation:
      outcome.reopenInvestigation,
  }
}
