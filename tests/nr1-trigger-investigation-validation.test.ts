import assert from "node:assert/strict"
import test from "node:test"

import {
  resolveCurrentHumanValidationForTechnicalGate,
  resolveTriggerInvestigationValidation,
} from "../src/lib/nr1-trigger-investigation-validation.ts"

test("confirmar resultado preserva o resultado sugerido", () => {
  const result = resolveTriggerInvestigationValidation({
    decision: "confirm_result",
    suggestedResult: "possible_risk_factor",
  })

  assert.deepEqual(result, {
    validationStatus: "validated",
    decisionType: "confirm_result",
    validatedResult: "possible_risk_factor",
    reopenInvestigation: false,
  })
})

test("ajustar resultado exige novo resultado", () => {
  assert.throws(
    () =>
      resolveTriggerInvestigationValidation({
        decision: "adjust_result",
        suggestedResult: "attention_point",
      }),
    /adjusted_result_required/,
  )
})

test("ajustar resultado registra resultado validado", () => {
  const result = resolveTriggerInvestigationValidation({
    decision: "adjust_result",
    suggestedResult: "attention_point",
    adjustedResult: "suggested_risk",
  })

  assert.equal(result.validationStatus, "validated")
  assert.equal(result.decisionType, "adjust_result")
  assert.equal(result.validatedResult, "suggested_risk")
  assert.equal(result.reopenInvestigation, false)
})

test("rejeitar resultado nao produz resultado validado", () => {
  const result = resolveTriggerInvestigationValidation({
    decision: "reject_result",
    suggestedResult: "suggested_risk",
  })

  assert.deepEqual(result, {
    validationStatus: "rejected",
    decisionType: "reject_result",
    validatedResult: null,
    reopenInvestigation: false,
  })
})

test("solicitar mais informacoes mantem decisao pendente", () => {
  const result = resolveTriggerInvestigationValidation({
    decision: "request_more_information",
    suggestedResult: "possible_risk_factor",
  })

  assert.deepEqual(result, {
    validationStatus: "needs_more_information",
    decisionType: "request_more_information",
    validatedResult: null,
    reopenInvestigation: true,
  })
})

test("validacao tecnica exige validacao humana vigente", () => {
  const result =
    resolveCurrentHumanValidationForTechnicalGate([])

  assert.equal(result.status, "missing")
  assert.equal(result.validatedResult, null)
})

test("ultima validacao humana validada libera resultado humano", () => {
  const result =
    resolveCurrentHumanValidationForTechnicalGate([
      {
        id: "human-1",
        validation_type: "human",
        validation_status: "validated",
        validated_result: "attention_point",
        created_at: "2026-09-28T10:00:00.000Z",
        revoked_at: null,
      },
      {
        id: "human-2",
        validation_type: "human",
        validation_status: "validated",
        validated_result: "suggested_risk",
        created_at: "2026-09-28T11:00:00.000Z",
        revoked_at: null,
      },
    ])

  assert.equal(result.status, "ready")
  assert.equal(result.validation?.id, "human-2")
  assert.equal(result.validatedResult, "suggested_risk")
})

test("validacao humana revogada nao libera validacao tecnica", () => {
  const result =
    resolveCurrentHumanValidationForTechnicalGate([
      {
        id: "human-revoked",
        validation_type: "human",
        validation_status: "revoked",
        validated_result: "suggested_risk",
        created_at: "2026-09-28T11:00:00.000Z",
        revoked_at: "2026-09-28T12:00:00.000Z",
      },
    ])

  assert.equal(result.status, "missing")
  assert.equal(result.validatedResult, null)
})

test("decisao humana nao validada bloqueia validacao tecnica", () => {
  const result =
    resolveCurrentHumanValidationForTechnicalGate([
      {
        id: "human-more-info",
        validation_type: "human",
        validation_status: "needs_more_information",
        validated_result: null,
        created_at: "2026-09-28T11:00:00.000Z",
        revoked_at: null,
      },
    ])

  assert.equal(result.status, "not_validated")
  assert.equal(result.validatedResult, null)
})
