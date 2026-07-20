import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import {
  executeNr1AdminRiskTextCorrection,
  parseNr1AdminRiskTextCorrectionBody,
  SANITIZED_CORRECTION_ERROR_MESSAGE,
  type Nr1AdminRiskTextCorrectionDependencies,
} from "../src/lib/server/nr1-admin-risk-text-correction.ts"

const migrationSql = readFileSync(
  new URL(
    "../supabase/migrations/20260720000001_add_nr1_admin_correct_diagnosis_risk_texts_rpc.sql",
    import.meta.url,
  ),
  "utf8",
)

const validBody = {
  establishment_id: "66056b86-8aef-4da9-98d6-4a93e9d63de3",
  risk_id: "c498e558-01ff-4a1d-83c4-e15f3e3021cc",
  diagnosis_session_id: "dccde0aa-fc87-476c-b601-5aee1b0c5619",
  diagnosis_review_id: "52ba4fe5-e589-4aab-b248-726b41d6f918",
  expected_risk_title: "Old title",
  expected_risk_exposed_group: "Old exposed group",
  expected_risk_source_circumstance: "Old source",
  expected_risk_updated_at: "2026-07-20T12:00:00.000Z",
  expected_review_exposed_group_json: [{ title: "FAROFA", activity: "COMIDA INDUSTRIAL" }],
  expected_review_updated_at: "2026-07-20T12:00:01.000Z",
  new_risk_title: "New title",
  new_risk_exposed_group: "New exposed group",
  new_risk_source_circumstance: "New source",
  new_review_label: "Human review label",
  reason: "Remove artificial test residue from formal PGR text.",
}

const requestTenantId = "0705b95a-8c81-461e-93dd-bc4ac8c7a298"
const resolvedTenantId = "1705b95a-8c81-461e-93dd-bc4ac8c7a298"
const actorUserId = "2705b95a-8c81-461e-93dd-bc4ac8c7a298"

type HarnessOptions = {
  role?: "owner" | "admin" | "member" | "viewer"
  scopeError?: unknown
  rpcError?: { code?: string; message?: string } | null
  rpcThrows?: unknown
}

function createRouteHarness(options: HarnessOptions = {}) {
  const rpcCalls: Array<Record<string, unknown>> = []
  const scopeCalls: Array<Record<string, unknown>> = []

  const dependencies: Nr1AdminRiskTextCorrectionDependencies = {
    resolveScope: async (input) => {
      scopeCalls.push(input)
      if (options.scopeError) throw options.scopeError
      return {
        tenantId: resolvedTenantId,
        role: options.role ?? "owner",
        user: { id: actorUserId },
      }
    },
    isTenantAdminRole: (role) => role === "owner" || role === "admin",
    callRpc: async (args) => {
      rpcCalls.push(args)
      if (options.rpcThrows) throw options.rpcThrows
      return {
        data: { audit_events_created: 2 },
        error: options.rpcError ?? null,
      }
    },
    mapScopeError: (error) => {
      const record = error as { status?: number; code?: string; message?: string }
      return {
        status: record.status ?? 500,
        body: {
          ok: false,
          error: record.code ?? "internal_error",
          message: record.message ?? "Unexpected internal detail",
        },
      }
    },
  }

  return {
    rpcCalls,
    scopeCalls,
    execute: () =>
      executeNr1AdminRiskTextCorrection(
        {
          req: new Request("https://local.test/api/nr1/admin/diagnosis-risk-text-correction"),
          tenantId: requestTenantId,
          rawBody: validBody,
        },
        dependencies,
      ),
  }
}

test("accepts the closed correction contract", () => {
  const result = parseNr1AdminRiskTextCorrectionBody(validBody)
  assert.equal(result.ok, true)
})

test("rejects fields outside the narrow contract", () => {
  const result = parseNr1AdminRiskTextCorrectionBody({ ...validBody, status: "controlled" })
  assert.deepEqual(result, {
    ok: false,
    error: "unexpected_fields",
    message: "Unexpected fields: status",
  })
})

test("requires all linked record IDs to be UUIDs", () => {
  const result = parseNr1AdminRiskTextCorrectionBody({ ...validBody, risk_id: "not-a-uuid" })
  assert.equal(result.ok, false)
  if (!result.ok) assert.equal(result.error, "invalid_ids")
})

test("requires both optimistic concurrency timestamps", () => {
  const result = parseNr1AdminRiskTextCorrectionBody({
    ...validBody,
    expected_review_updated_at: "yesterday",
  })
  assert.equal(result.ok, false)
  if (!result.ok) assert.equal(result.error, "invalid_updated_at")
})

test("requires the exact single review object that the RPC will label", () => {
  const result = parseNr1AdminRiskTextCorrectionBody({
    ...validBody,
    expected_review_exposed_group_json: [],
  })
  assert.equal(result.ok, false)
  if (!result.ok) assert.equal(result.error, "invalid_expected_review_json")
})

test("rejects blank replacement text", () => {
  const result = parseNr1AdminRiskTextCorrectionBody({ ...validBody, new_review_label: "   " })
  assert.equal(result.ok, false)
  if (!result.ok) assert.equal(result.error, "invalid_text_fields")
})

test("RPC locks both rows and checks both updated_at preconditions", () => {
  assert.match(migrationSql, /for update;/i)
  assert.match(migrationSql, /for update of dr;/i)
  assert.match(
    migrationSql,
    /v_risk\.updated_at is distinct from p_expected_risk_updated_at/i,
  )
  assert.match(
    migrationSql,
    /v_review\.updated_at is distinct from p_expected_review_updated_at/i,
  )
})

test("RPC writes two atomic audit rows and is executable only by service_role", () => {
  assert.match(migrationSql, /insert into public\.nr1_audit_events/i)
  assert.match(migrationSql, /'audit_events_created', 2/i)
  assert.match(
    migrationSql,
    /revoke all on function[\s\S]+from public, anon, authenticated;/i,
  )
  assert.match(migrationSql, /grant execute on function[\s\S]+to service_role;/i)
})

test("SECURITY DEFINER uses only pg_catalog in search_path", () => {
  assert.match(migrationSql, /security definer\s+set search_path = pg_catalog\s+as \$\$/i)
  assert.doesNotMatch(migrationSql, /set search_path\s*=\s*[^\n]*public/i)
})

for (const role of ["owner", "admin"] as const) {
  test(`${role} is authorized before the RPC is called`, async () => {
    const harness = createRouteHarness({ role })
    const result = await harness.execute()

    assert.equal(result.status, 200)
    assert.equal(harness.rpcCalls.length, 1)
  })
}

for (const role of ["member", "viewer"] as const) {
  test(`${role} receives 403 and the RPC is not called`, async () => {
    const harness = createRouteHarness({ role })
    const result = await harness.execute()

    assert.equal(result.status, 403)
    assert.equal(result.body.error, "nr1_admin_risk_text_correction_forbidden")
    assert.equal(harness.rpcCalls.length, 0)
  })
}

test("401 from scope resolution prevents the RPC call", async () => {
  const harness = createRouteHarness({
    scopeError: { status: 401, code: "missing_bearer", message: "Missing bearer token" },
  })
  const result = await harness.execute()

  assert.equal(result.status, 401)
  assert.equal(result.body.error, "missing_bearer")
  assert.equal(harness.rpcCalls.length, 0)
})

test("404 from establishment scope prevents the RPC call", async () => {
  const harness = createRouteHarness({
    scopeError: {
      status: 404,
      code: "establishment_not_found",
      message: "Establishment not found in tenant",
    },
  })
  const result = await harness.execute()

  assert.equal(result.status, 404)
  assert.equal(result.body.error, "establishment_not_found")
  assert.equal(harness.rpcCalls.length, 0)
})

test("RPC arguments preserve tenant, establishment, session, record and actor isolation", async () => {
  const harness = createRouteHarness({ role: "admin" })
  await harness.execute()

  assert.equal(harness.scopeCalls.length, 1)
  assert.equal(harness.scopeCalls[0].tenantId, requestTenantId)
  assert.equal(harness.scopeCalls[0].establishmentId, validBody.establishment_id)
  assert.deepEqual(harness.rpcCalls[0], {
    p_tenant_id: resolvedTenantId,
    p_establishment_id: validBody.establishment_id,
    p_risk_id: validBody.risk_id,
    p_diagnosis_session_id: validBody.diagnosis_session_id,
    p_diagnosis_review_id: validBody.diagnosis_review_id,
    p_expected_risk_title: validBody.expected_risk_title,
    p_expected_risk_exposed_group: validBody.expected_risk_exposed_group,
    p_expected_risk_source_circumstance: validBody.expected_risk_source_circumstance,
    p_expected_risk_updated_at: validBody.expected_risk_updated_at,
    p_expected_review_exposed_group_json: validBody.expected_review_exposed_group_json,
    p_expected_review_updated_at: validBody.expected_review_updated_at,
    p_new_risk_title: validBody.new_risk_title,
    p_new_risk_exposed_group: validBody.new_risk_exposed_group,
    p_new_risk_source_circumstance: validBody.new_risk_source_circumstance,
    p_new_review_label: validBody.new_review_label,
    p_actor_user_id: actorUserId,
    p_reason: validBody.reason,
  })
})

test("40001 is mapped to HTTP 409 without returning the database message", async () => {
  const harness = createRouteHarness({
    rpcError: { code: "40001", message: "risk_precondition_failed: private detail" },
  })
  const result = await harness.execute()

  assert.equal(result.status, 409)
  assert.equal(result.body.error, "correction_precondition_failed")
  assert.doesNotMatch(JSON.stringify(result.body), /private detail/i)
})

test("P0002 from the RPC is mapped to a scoped HTTP 404", async () => {
  const harness = createRouteHarness({
    rpcError: { code: "P0002", message: "risk_not_found_for_supplied_scope_and_ids" },
  })
  const result = await harness.execute()

  assert.equal(result.status, 404)
  assert.equal(result.body.error, "correction_target_not_found")
})

test("unexpected RPC errors return a fixed sanitized HTTP 500", async () => {
  const harness = createRouteHarness({
    rpcError: { code: "XX000", message: "relation secret_table exposed internal detail" },
  })
  const result = await harness.execute()

  assert.deepEqual(result, {
    status: 500,
    body: {
      ok: false,
      error: "nr1_admin_risk_text_correction_failed",
      message: SANITIZED_CORRECTION_ERROR_MESSAGE,
    },
  })
  assert.doesNotMatch(JSON.stringify(result.body), /secret_table|internal detail/i)
})

test("unexpected thrown errors are also sanitized", async () => {
  const harness = createRouteHarness({
    rpcThrows: new Error("service role database detail"),
  })
  const result = await harness.execute()

  assert.equal(result.status, 500)
  assert.equal(result.body.message, SANITIZED_CORRECTION_ERROR_MESSAGE)
  assert.doesNotMatch(JSON.stringify(result.body), /service role database detail/i)
})
