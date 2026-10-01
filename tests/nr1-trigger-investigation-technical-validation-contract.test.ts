import assert from "node:assert/strict"
import fs from "node:fs"
import test from "node:test"

const routePath =
  "app/api/nr1/trigger-investigations/[id]/technical-validation/route.ts"

const source = fs.readFileSync(
  routePath,
  "utf8",
)

test("rota usa cliente autenticado e nao usa service role", () => {
  assert.match(
    source,
    /createNr1UserClientFromBearer/,
  )

  assert.doesNotMatch(
    source,
    /service[_-]?role/i,
  )
})

test("somente owner ou admin podem registrar validacao tecnica", () => {
  assert.match(
    source,
    /isTenantAdminRole\(scope\.role\)/,
  )

  assert.match(
    source,
    /nr1_trigger_technical_validation_forbidden/,
  )
})

test("investigacao precisa estar concluida", () => {
  assert.match(
    source,
    /investigation\.investigation_status !==\s*"completed"/,
  )

  assert.match(
    source,
    /nr1_trigger_investigation_not_ready_for_technical_validation/,
  )
})

test("validacao tecnica exige sinalizacao tecnica obrigatoria", () => {
  assert.match(
    source,
    /investigation\.technical_validation_required !==\s*true/,
  )

  assert.match(
    source,
    /nr1_trigger_technical_validation_not_required/,
  )
})

test("rota trabalha apenas com os quatro resultados tecnicos", () => {
  for (const result of [
    "no_relevant_indication",
    "attention_point",
    "possible_risk_factor",
    "suggested_risk",
  ]) {
    assert.match(
      source,
      new RegExp(result),
    )
  }

  assert.doesNotMatch(
    source,
    /"pending_technical_validation"/,
  )

  assert.doesNotMatch(
    source,
    /"critical_alert"/,
  )
})

test("rota usa o contrato oficial de validacao tecnica", () => {
  assert.match(
    source,
    /buildTechnicalValidationRecord/,
  )
})

test("validacao tecnica persiste no storage oficial", () => {
  assert.match(
    source,
    /\.from\("nr1_trigger_investigation_validations"\)/,
  )

  assert.match(
    source,
    /\.insert\(validationRecord as ValidationInsert\)/,
  )

  assert.doesNotMatch(
    source,
    /nr1_trigger_validation_storage_not_ready/,
  )
})

test("validacao tecnica nao cria risco ou plano de acao", () => {
  assert.doesNotMatch(
    source,
    /\.from\("nr1_risks"\)/,
  )

  assert.doesNotMatch(
    source,
    /\.from\("nr1_action_plans"\)/,
  )
})

test("snapshot de validacao preserva as respostas da investigacao", () => {
  assert.match(
    source,
    /\.from\("nr1_trigger_investigation_answers"\)/,
  )

  assert.match(
    source,
    /sourceSnapshot:[\s\S]*answers,/,
  )
})
