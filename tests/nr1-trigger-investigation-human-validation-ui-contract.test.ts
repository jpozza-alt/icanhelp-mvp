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

test("client exposes explicit human validation action", () => {
  assert.match(
    client,
    /validateTriggerInvestigationHumanClient/,
  )

  assert.match(
    client,
    /\/human-validation/,
  )

  assert.match(
    client,
    /decision,\s*notes/,
  )
})

test("workspace exposes human confirmation only after completed investigation", () => {
  assert.match(
    workspace,
    /handleConfirmTriggerInvestigationResult/,
  )

  assert.match(
    workspace,
    /investigation\.investigation_status !== "completed"/,
  )

  assert.match(
    workspace,
    /"Confirmar resultado"/,
  )

  assert.match(
    workspace,
    /triggerInvestigationSaving[\s\S]*?"Confirmando\.\.\."[\s\S]*?"Confirmar resultado"/,
  )
})

test("human confirmation updates persisted validation state in UI", () => {
  assert.match(
    workspace,
    /human_validation:\s*\{/,
  )

  assert.match(
    workspace,
    /validation_type: "human"/,
  )

  assert.match(
    workspace,
    /effective_result:/,
  )
})

test("technical-required path remains pending after human confirmation", () => {
  assert.match(
    workspace,
    /result\.technicalValidationRequired\s*\?\s*null/,
  )

  assert.match(
    workspace,
    /Agora é necessária a validação técnica/,
  )
})

test("human confirmation does not automatically create risk or action plan", () => {
  const start =
    workspace.indexOf(
      "async function handleConfirmTriggerInvestigationResult",
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
    /nr1_action_plans/,
  )
})