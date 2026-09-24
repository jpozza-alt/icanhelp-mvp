import assert from "node:assert/strict"
import fs from "node:fs"
import test from "node:test"

const routePath =
  "app/api/nr1/trigger-investigations/[id]/human-validation/route.ts"

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

test("somente owner ou admin podem validar", () => {
  assert.match(
    source,
    /isTenantAdminRole\(scope\.role\)/,
  )

  assert.match(
    source,
    /nr1_trigger_human_validation_forbidden/,
  )
})

test("investigacao precisa estar concluida", () => {
  assert.match(
    source,
    /investigation\.investigation_status !==\s*"completed"/,
  )

  assert.match(
    source,
    /nr1_trigger_investigation_not_ready_for_review/,
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

test("rota usa o contrato oficial de validacao humana", () => {
  assert.match(
    source,
    /buildHumanValidationRecord/,
  )
})

test("persistencia permanece desativada enquanto migration for candidata", () => {
  assert.match(
    source,
    /nr1_trigger_validation_storage_not_ready/,
  )

  assert.match(
    source,
    /return json\(503/,
  )
})

test("validacao humana nao cria risco ou plano de acao", () => {
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
