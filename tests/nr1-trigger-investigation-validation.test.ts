import assert from "node:assert/strict"
import test from "node:test"

import {
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

