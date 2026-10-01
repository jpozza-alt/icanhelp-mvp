import assert from "node:assert/strict"
import fs from "node:fs"
import test from "node:test"

const routePath =
  "app/api/nr1/diagnosis-review/route.ts"

const source = fs.readFileSync(
  routePath,
  "utf8",
)

test("investigacao de gatilho exige conversao explicita", () => {
  assert.match(
    source,
    /explicit_conversion\?: boolean/,
  )

  assert.match(
    source,
    /trigger_investigation_id\?: string/,
  )

  assert.match(
    source,
    /reason: "explicit_conversion_required"/,
  )
})

test("conversao consulta validacoes persistidas no mesmo escopo", () => {
  assert.match(
    source,
    /\.from\("nr1_trigger_investigation_validations"\)/,
  )

  assert.match(
    source,
    /\.eq\("tenant_id", params\.scope\.tenantId\)/,
  )

  assert.match(
    source,
    /\.eq\("establishment_id", params\.establishmentId\)/,
  )
})

test("resultado efetivo nasce da validacao humana valida", () => {
  assert.match(
    source,
    /currentHumanValidation/,
  )

  assert.match(
    source,
    /human_validation_required/,
  )

  assert.match(
    source,
    /effectiveResult[\s\S]*currentHumanValidation\.validated_result/,
  )
})

test("validacao tecnica passa a ser fonte quando obrigatoria", () => {
  assert.match(
    source,
    /technical_validation_required === true/,
  )

  assert.match(
    source,
    /currentTechnicalValidation/,
  )

  assert.match(
    source,
    /technical_validation_required/,
  )

  assert.match(
    source,
    /effectiveResult[\s\S]*currentTechnicalValidation\.validated_result/,
  )
})

test("validacao tecnica deve pertencer a validacao humana vigente", () => {
  assert.match(
    source,
    /source_snapshot_json/,
  )

  assert.match(
    source,
    /technicalSourceRecord/,
  )

  assert.match(
    source,
    /technicalSourceRecord\.human_validation_id/,
  )

  assert.match(
    source,
    /technicalSourceRecord\.human_validated_result/,
  )

  assert.match(
    source,
    /technicalHumanValidationId !==[\s\S]*currentHumanValidationId/,
  )

  assert.match(
    source,
    /technicalHumanValidatedResult !==[\s\S]*currentHumanValidatedResult/,
  )

  assert.match(
    source,
    /reason: "technical_validation_stale"/,
  )
})
test("somente suggested_risk permite conversao", () => {
  assert.match(
    source,
    /effectiveResult !== "suggested_risk"/,
  )

  assert.match(
    source,
    /effective_result_not_convertible/,
  )
})

test("status converted_to_risk ocorre somente depois de existir riskId", () => {
  const riskIdGate =
    source.indexOf(
      'if (!riskId) {',
    )

  const conversionUpdate =
    source.indexOf(
      'investigation_status: "converted_to_risk"',
    )

  assert.ok(riskIdGate >= 0)
  assert.ok(conversionUpdate > riskIdGate)

  assert.match(
    source,
    /\.eq\("investigation_status", "completed"\)/,
  )
})

test("auditoria diferencia conversao explicita", () => {
  assert.match(
    source,
    /trigger_investigation_explicit_conversion/,
  )

  assert.match(
    source,
    /trigger_investigation_id:[\s\S]*conversionInvestigationId/,
  )

  assert.match(
    source,
    /effective_result:[\s\S]*"suggested_risk"/,
  )
})

test("C5.4A nao cria plano de acao", () => {
  assert.doesNotMatch(
    source,
    /\.from\("nr1_action_plans"\)/,
  )
})
test("conversao explicita preserva um risco por investigacao", () => {
  assert.match(
    source,
    /if \(!conversionInvestigationId\)[\s\S]*?existingRiskResult/,
  )

  assert.match(
    source,
    /investigation_status: "converted_to_risk"[\s\S]*?generated_risk_id: riskId/,
  )

  assert.doesNotMatch(
    source,
    /unresolvedOtherTriggerInvestigations/,
  )
})