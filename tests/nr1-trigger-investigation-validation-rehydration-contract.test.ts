import assert from "node:assert/strict"
import fs from "node:fs"
import test from "node:test"

const routePath =
  "app/api/nr1/trigger-investigations/[id]/validations/route.ts"

const clientPath =
  "src/lib/nr1-trigger-investigation-client.ts"

const route = fs.readFileSync(
  routePath,
  "utf8",
)

const client = fs.readFileSync(
  clientPath,
  "utf8",
)

test("rehydration consulta validacoes no mesmo tenant e estabelecimento", () => {
  assert.match(
    route,
    /\.eq\("tenant_id", scope\.tenantId\)/,
  )

  assert.match(
    route,
    /\.eq\("establishment_id", establishmentId\)/,
  )

  assert.match(
    route,
    /\.eq\(\s*"trigger_investigation_id",\s*investigationId/,
  )
})

test("rehydration usa somente validacoes vigentes", () => {
  assert.match(
    route,
    /\.is\("revoked_at", null\)/,
  )

  assert.match(
    route,
    /\.neq\("validation_status", "revoked"\)/,
  )
})

test("rehydration identifica validacao tecnica vinculada a humana atual", () => {
  assert.match(
    route,
    /human_validation_id/,
  )

  assert.match(
    route,
    /human_validated_result/,
  )

  assert.match(
    route,
    /technicalValidationCurrent/,
  )
})

test("resultado efetivo reidratado respeita exigencia tecnica", () => {
  assert.match(
    route,
    /technical_validation_required === true/,
  )

  assert.match(
    route,
    /effectiveResult/,
  )
})

test("client reidrata validacao humana, tecnica e resultado efetivo", () => {
  assert.match(
    client,
    /\/validations/,
  )

  assert.match(
    client,
    /human_validation:/,
  )

  assert.match(
    client,
    /technical_validation:/,
  )

  assert.match(
    client,
    /technical_validation_current:/,
  )

  assert.match(
    client,
    /effective_result:/,
  )
})

test("rehydration nao cria risco ou plano de acao", () => {
  assert.doesNotMatch(
    route,
    /\.from\("nr1_risks"\)/,
  )

  assert.doesNotMatch(
    route,
    /\.from\("nr1_action_plans"\)/,
  )
})