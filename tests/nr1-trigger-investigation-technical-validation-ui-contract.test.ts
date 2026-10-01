import assert from "node:assert/strict"
import fs from "node:fs"
import test from "node:test"

const client = fs.readFileSync(
  "src/lib/nr1-trigger-investigation-client.ts",
  "utf8",
)

const workspace = fs.readFileSync(
  "app/dashboard/nr1/workspace/page.tsx",
  "utf8",
)

test("client exposes technical validation action", () => {
  assert.match(
    client,
    /validateTriggerInvestigationTechnicalClient/,
  )

  assert.match(
    client,
    /\/technical-validation/,
  )

  assert.match(
    client,
    /decision,\s*notes/,
  )
})

test("technical validation requires completed investigation and current human validation", () => {
  assert.match(
    workspace,
    /handleConfirmTriggerInvestigationTechnicalValidation/,
  )

  assert.match(
    workspace,
    /investigation\.investigation_status !== "completed"/,
  )

  assert.match(
    workspace,
    /investigation\.human_validation\?\.validation_status !==\s*"validated"/,
  )
})

test("technical validation action only appears when required", () => {
  assert.match(
    workspace,
    /investigation\.technical_validation_required/,
  )

  assert.match(
    workspace,
    /"Registrar validação técnica"/,
  )

  assert.match(
    workspace,
    /membershipRole === "owner"/,
  )

  assert.match(
    workspace,
    /membershipRole === "admin"/,
  )
})

test("technical validation updates technical state and effective result", () => {
  assert.match(
    workspace,
    /technical_validation:\s*\{/,
  )

  assert.match(
    workspace,
    /validation_type: "technical"/,
  )

  assert.match(
    workspace,
    /technical_validation_current: true/,
  )

  assert.match(
    workspace,
    /effective_result:\s*result\.validatedResult/,
  )
})

test("technical validation does not automatically convert risk", () => {
  const start =
    workspace.indexOf(
      "async function handleConfirmTriggerInvestigationTechnicalValidation",
    )

  const end =
    workspace.indexOf(
      "const loadRisks = useCallback",
      start,
    )

  assert.ok(start >= 0)
  assert.ok(end > start)

  const handler =
    workspace.slice(start, end)

  assert.doesNotMatch(
    handler,
    /generate_risk:\s*true/,
  )

  assert.doesNotMatch(
    handler,
    /explicit_conversion:\s*true/,
  )

  assert.doesNotMatch(
    handler,
    /nr1_action_plans/,
  )
})