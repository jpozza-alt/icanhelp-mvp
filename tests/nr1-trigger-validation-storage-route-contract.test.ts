import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const human = readFileSync(
  "app/api/nr1/trigger-investigations/[id]/human-validation/route.ts",
  "utf8",
)

const technical = readFileSync(
  "app/api/nr1/trigger-investigations/[id]/technical-validation/route.ts",
  "utf8",
)

test("human validation persists instead of returning storage-not-ready", () => {
  assert.match(
    human,
    /\.from\("nr1_trigger_investigation_validations"\)[\s\S]*?\.insert\(/,
  )

  assert.doesNotMatch(
    human,
    /nr1_trigger_validation_storage_not_ready/,
  )
})

test("technical validation uses current human validated result", () => {
  assert.match(
    technical,
    /\.eq\("validation_type", "human"\)/,
  )

  assert.match(
    technical,
    /const suggestedResult = humanValidatedResult/,
  )

  assert.match(
    technical,
    /human_validation_id:[\s\S]*?currentHumanValidation\.id/,
  )

  assert.doesNotMatch(
    technical,
    /const suggestedResult\s*=\s*investigation\.suggested_result/,
  )
})

test("technical validation persists its record", () => {
  assert.match(
    technical,
    /\.from\("nr1_trigger_investigation_validations"\)[\s\S]*?\.insert\(/,
  )

  assert.doesNotMatch(
    technical,
    /nr1_trigger_validation_storage_not_ready/,
  )
})