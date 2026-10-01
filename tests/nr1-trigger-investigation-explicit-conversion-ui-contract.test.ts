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

test("client preserves existing diagnosis review before explicit conversion", () => {
  assert.match(
    client,
    /reviewGetPath/,
  )

  assert.match(
    client,
    /confirmed_exposed_group_json:\s*reviewItem\.confirmed_exposed_group_json/,
  )

  assert.match(
    client,
    /confirmed_hazards_json:\s*reviewItem\.confirmed_hazards_json/,
  )

  assert.match(
    client,
    /reviewed_at:\s*reviewItem\.reviewed_at/,
  )
})

test("client requests explicit conversion for one investigation", () => {
  assert.match(
    client,
    /generate_risk:\s*true/,
  )

  assert.match(
    client,
    /explicit_conversion:\s*true/,
  )

  assert.match(
    client,
    /trigger_investigation_id:\s*investigationId/,
  )
})

test("UI conversion requires completed applicable validations and suggested risk", () => {
  assert.match(
    workspace,
    /investigation\.investigation_status !== "completed"/,
  )

  assert.match(
    workspace,
    /investigation\.human_validation\?\.validation_status !==\s*"validated"/,
  )

  assert.match(
    workspace,
    /investigation\.technical_validation_current/,
  )

  assert.match(
    workspace,
    /investigation\.effective_result !==\s*"suggested_risk"/,
  )
})

test("workspace exposes explicit convert to risk action", () => {
  assert.match(
    workspace,
    /handleConvertTriggerInvestigationToRisk/,
  )

  assert.match(
    workspace,
    /"Converter em risco"/,
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

test("successful conversion links returned risk to investigation UI state", () => {
  assert.match(
    workspace,
    /investigation_status:\s*"converted_to_risk"/,
  )

  assert.match(
    workspace,
    /generated_risk_id:\s*result\.riskId/,
  )

  assert.match(
    workspace,
    /setSelectedRiskId\(result\.riskId\)/,
  )
})

test("explicit conversion does not automatically create action plan", () => {
  const start =
    workspace.indexOf(
      "async function handleConvertTriggerInvestigationToRisk",
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
    /handleCreateActionPlan/,
  )

  assert.doesNotMatch(
    handler,
    /\.from\("nr1_action_plans"\)/,
  )

  assert.doesNotMatch(
    handler,
    /action_plan_created/,
  )
})

test("non suggested-risk effective results have no conversion action condition", () => {
  assert.match(
    workspace,
    /investigation\.effective_result === "suggested_risk"/,
  )
})