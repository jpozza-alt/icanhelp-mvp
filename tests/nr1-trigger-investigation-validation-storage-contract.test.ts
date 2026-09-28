import assert from "node:assert/strict"
import fs from "node:fs"
import test from "node:test"

const migrationPath =
  "supabase/migrations/20260923152000_create_nr1_trigger_investigation_validations_candidate.sql"

const source = fs.readFileSync(
  migrationPath,
  "utf8",
)

test("validacao tecnica exige validacao humana vigente", () => {
  assert.match(
    source,
    /NEW\.validation_type <> 'technical'/,
  )

  assert.match(
    source,
    /validation_type = 'human'/,
  )

  assert.match(
    source,
    /validation_status <> 'revoked'/,
  )

  assert.match(
    source,
    /revoked_at IS NULL/,
  )

  assert.match(
    source,
    /ORDER BY[\s\S]*created_at DESC,[\s\S]*id DESC/,
  )

  assert.match(
    source,
    /LIMIT 1/,
  )
})

test("validacao tecnica exige resultado humano validado", () => {
  assert.match(
    source,
    /current_human_status <> 'validated'/,
  )

  assert.match(
    source,
    /current_human_result IS NULL/,
  )
})

test("snapshot tecnico deve usar resultado humano vigente", () => {
  assert.match(
    source,
    /NEW\.suggested_result_snapshot IS DISTINCT FROM[\s\S]*current_human_result/,
  )
})

test("guard atua antes do insert tecnico", () => {
  assert.match(
    source,
    /CREATE TRIGGER[\s\S]*trg_nr1_tiv_technical_requires_current_human[\s\S]*BEFORE INSERT/,
  )

  assert.match(
    source,
    /nr1_tiv_guard_technical_requires_current_human/,
  )
})

test("migration continua sem criar risco automaticamente", () => {
  assert.match(
    source,
    /Validation never creates a risk automatically\./,
  )

  assert.doesNotMatch(
    source,
    /INSERT\s+INTO\s+public\.nr1_risks/i,
  )
})