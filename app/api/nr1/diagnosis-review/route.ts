import { NextRequest, NextResponse } from "next/server"
import type { Json } from "@/lib/database.types"
import type {
  Nr1DiagnosisReviewRow,
  Nr1DiagnosisSessionRow,
} from "@/lib/nr1-db-types"
import {
  createNr1UserClientFromBearer,
  extractBearerToken,
  isTenantAdminRole,
  nr1ErrorToResponsePayload,
  resolveNr1Scope,
} from "@/lib/server/nr1-scope"

export const dynamic = "force-dynamic"

type UpsertDiagnosisReviewBody = {
  establishment_id?: string
  diagnosis_session_id?: string
  confirmed_exposed_group_json?: Json
  confirmed_hazards_json?: Json
  preliminary_priority?: string | null
  reviewer_comment?: string | null
  reviewed_at?: string | null
}

function json(status: number, payload: Record<string, unknown>) {
  return NextResponse.json(payload, { status })
}

function getTenantId(req: NextRequest): string {
  const queryValue = (req.nextUrl.searchParams.get("tenantId") || "").trim()
  const headerValue = (req.headers.get("x-icanhelp-tenant") || "").trim()

  return queryValue || headerValue
}

function getRequiredEstablishmentId(req: NextRequest): string | null {
  const value = (req.nextUrl.searchParams.get("establishmentId") || "").trim()
  return value || null
}

function getRequiredDiagnosisSessionId(req: NextRequest): string | null {
  const value = (req.nextUrl.searchParams.get("diagnosisSessionId") || "").trim()
  return value || null
}

function cleanText(value: unknown): string | null {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function normalizeJson(value: unknown, fallback: Json): Json {
  if (value === undefined) return fallback
  return value as Json
}

function resolveReviewedAt(value: unknown): string | null {
  const cleaned = cleanText(value)
  return cleaned
}

async function requireDiagnosisSessionInScope(
  userClient: ReturnType<typeof createNr1UserClientFromBearer>,
  tenantId: string,
  establishmentId: string,
  diagnosisSessionId: string,
) {
  const result = await userClient
    .from("nr1_diagnosis_sessions")
    .select("*")
    .eq("id", diagnosisSessionId)
    .eq("tenant_id", tenantId)
    .eq("establishment_id", establishmentId)
    .is("deleted_at", null)

  if (result.error) {
    return {
      ok: false as const,
      status: 500,
      error: "nr1_diagnosis_session_lookup_failed",
      message: result.error.message,
    }
  }

  const rows = (result.data || []) as Nr1DiagnosisSessionRow[]

  if (rows.length === 0) {
    return {
      ok: false as const,
      status: 404,
      error: "nr1_diagnosis_session_not_found",
      message: "No nr1_diagnosis_sessions row found for tenant_id + establishment_id + diagnosis_session_id",
    }
  }

  if (rows.length > 1) {
    return {
      ok: false as const,
      status: 409,
      error: "nr1_diagnosis_session_duplicate",
      message: "Expected 1 diagnosis session row, got " + String(rows.length),
    }
  }

  return {
    ok: true as const,
    row: rows[0],
  }
}

export async function GET(req: NextRequest) {
  try {
    const tenantId = getTenantId(req)
    const establishmentId = getRequiredEstablishmentId(req)
    const diagnosisSessionId = getRequiredDiagnosisSessionId(req)

    if (!tenantId) {
      return json(400, {
        ok: false,
        error: "missing_tenant_id",
        message: "Provide tenantId in querystring or x-icanhelp-tenant header",
      })
    }

    if (!establishmentId) {
      return json(400, {
        ok: false,
        error: "missing_establishment_id",
        message: "Provide establishmentId in querystring",
      })
    }

    if (!diagnosisSessionId) {
      return json(400, {
        ok: false,
        error: "missing_diagnosis_session_id",
        message: "Provide diagnosisSessionId in querystring",
      })
    }

    const scope = await resolveNr1Scope({
      req,
      tenantId,
      establishmentId,
    })

    const bearerToken = extractBearerToken(req)
    if (!bearerToken) {
      return json(401, {
        ok: false,
        error: "missing_bearer",
        message: "Missing bearer token",
      })
    }

    const userClient = createNr1UserClientFromBearer(bearerToken)

    const sessionCheck = await requireDiagnosisSessionInScope(
      userClient,
      scope.tenantId,
      establishmentId,
      diagnosisSessionId,
    )

    if (!sessionCheck.ok) {
      return json(sessionCheck.status, {
        ok: false,
        error: sessionCheck.error,
        message: sessionCheck.message,
      })
    }

    const result = await userClient
      .from("nr1_diagnosis_review")
      .select("*")
      .eq("tenant_id", scope.tenantId)
      .eq("diagnosis_session_id", diagnosisSessionId)

    if (result.error) {
      return json(500, {
        ok: false,
        error: "nr1_diagnosis_review_get_failed",
        message: result.error.message,
      })
    }

    const rows = (result.data || []) as Nr1DiagnosisReviewRow[]

    if (rows.length === 0) {
      return json(200, {
        ok: true,
        tenantId: scope.tenantId,
        establishmentId,
        diagnosisSessionId,
        membershipRole: scope.role,
        session: {
          id: sessionCheck.row.id,
          department_id: sessionCheck.row.department_id,
          activity_id: sessionCheck.row.activity_id,
          current_stage: sessionCheck.row.current_stage,
          overall_status: sessionCheck.row.overall_status,
          progress_percent: sessionCheck.row.progress_percent,
        },
        item: null,
      })
    }

    if (rows.length > 1) {
      return json(409, {
        ok: false,
        error: "nr1_diagnosis_review_duplicate",
        message: "Expected 1 diagnosis review row, got " + String(rows.length),
      })
    }

    const row = rows[0]

    return json(200, {
      ok: true,
      tenantId: scope.tenantId,
      establishmentId,
      diagnosisSessionId,
      membershipRole: scope.role,
      session: {
        id: sessionCheck.row.id,
        department_id: sessionCheck.row.department_id,
        activity_id: sessionCheck.row.activity_id,
        current_stage: sessionCheck.row.current_stage,
        overall_status: sessionCheck.row.overall_status,
        progress_percent: sessionCheck.row.progress_percent,
      },
      item: {
        id: row.id,
        tenant_id: row.tenant_id,
        diagnosis_session_id: row.diagnosis_session_id,
        confirmed_exposed_group_json: row.confirmed_exposed_group_json,
        confirmed_hazards_json: row.confirmed_hazards_json,
        preliminary_priority: row.preliminary_priority,
        reviewed_at: row.reviewed_at,
        reviewed_by: row.reviewed_by,
        reviewer_comment: row.reviewer_comment,
        created_at: row.created_at,
        updated_at: row.updated_at,
      },
    })
  } catch (error) {
    const response = nr1ErrorToResponsePayload(error)
    return json(response.status, response.body)
  }
}

export async function POST(req: NextRequest) {
  try {
    const tenantId = getTenantId(req)

    if (!tenantId) {
      return json(400, {
        ok: false,
        error: "missing_tenant_id",
        message: "Provide tenantId in querystring or x-icanhelp-tenant header",
      })
    }

    let body: UpsertDiagnosisReviewBody
    try {
      body = (await req.json()) as UpsertDiagnosisReviewBody
    } catch {
      return json(400, {
        ok: false,
        error: "invalid_json",
        message: "Request body must be valid JSON",
      })
    }

    const establishmentId = cleanText(body.establishment_id)
    const diagnosisSessionId = cleanText(body.diagnosis_session_id)

    if (!establishmentId) {
      return json(400, {
        ok: false,
        error: "missing_establishment_id",
        message: "establishment_id is required",
      })
    }

    if (!diagnosisSessionId) {
      return json(400, {
        ok: false,
        error: "missing_diagnosis_session_id",
        message: "diagnosis_session_id is required",
      })
    }

    const scope = await resolveNr1Scope({
      req,
      tenantId,
      establishmentId,
    })

    if (!isTenantAdminRole(scope.role)) {
      return json(403, {
        ok: false,
        error: "nr1_diagnosis_review_upsert_forbidden",
        message: "Only owner or admin can upsert diagnosis review",
      })
    }

    const bearerToken = extractBearerToken(req)
    if (!bearerToken) {
      return json(401, {
        ok: false,
        error: "missing_bearer",
        message: "Missing bearer token",
      })
    }

    const userClient = createNr1UserClientFromBearer(bearerToken)

    const sessionCheck = await requireDiagnosisSessionInScope(
      userClient,
      scope.tenantId,
      establishmentId,
      diagnosisSessionId,
    )

    if (!sessionCheck.ok) {
      return json(sessionCheck.status, {
        ok: false,
        error: sessionCheck.error,
        message: sessionCheck.message,
      })
    }

    const existingResult = await userClient
      .from("nr1_diagnosis_review")
      .select("*")
      .eq("tenant_id", scope.tenantId)
      .eq("diagnosis_session_id", diagnosisSessionId)

    if (existingResult.error) {
      return json(500, {
        ok: false,
        error: "nr1_diagnosis_review_existing_lookup_failed",
        message: existingResult.error.message,
      })
    }

    const existingRows = (existingResult.data || []) as Nr1DiagnosisReviewRow[]

    const reviewedAt = resolveReviewedAt(body.reviewed_at)
    const reviewedBy = reviewedAt ? scope.user.id : null

    const payload = {
      tenant_id: scope.tenantId,
      diagnosis_session_id: diagnosisSessionId,
      confirmed_exposed_group_json: normalizeJson(body.confirmed_exposed_group_json, []),
      confirmed_hazards_json: normalizeJson(body.confirmed_hazards_json, []),
      preliminary_priority: cleanText(body.preliminary_priority),
      reviewed_at: reviewedAt,
      reviewed_by: reviewedBy,
      reviewer_comment: cleanText(body.reviewer_comment),
    }

    const nowIso = new Date().toISOString()
    const sessionPromotionPayload = reviewedAt
      ? {
          current_stage: "review",
          overall_status: "review_pending",
          progress_percent: 100,
          completed_at: reviewedAt,
          reopened_at: null,
          last_saved_at: nowIso,
        }
      : {
          current_stage: "review",
          overall_status: "in_progress",
          progress_percent: 90,
          completed_at: null,
          last_saved_at: nowIso,
        }

    if (existingRows.length === 0) {
      const insertResult = await userClient
        .from("nr1_diagnosis_review")
        .insert(payload)
        .select("*")

      if (insertResult.error) {
        return json(500, {
          ok: false,
          error: "nr1_diagnosis_review_create_failed",
          message: insertResult.error.message,
        })
      }

      const rows = (insertResult.data || []) as Nr1DiagnosisReviewRow[]

      if (rows.length !== 1) {
        return json(500, {
          ok: false,
          error: "nr1_diagnosis_review_create_invalid_result",
          message: "Expected 1 inserted row, got " + String(rows.length),
        })
      }

      const row = rows[0]

      const sessionUpdateResult = await userClient
        .from("nr1_diagnosis_sessions")
        .update(sessionPromotionPayload)
        .eq("id", sessionCheck.row.id)
        .select("*")

      if (sessionUpdateResult.error) {
        return json(500, {
          ok: false,
          error: "nr1_diagnosis_session_promote_after_review_failed",
          message: sessionUpdateResult.error.message,
        })
      }

      const refreshedSessionRow =
        Array.isArray(sessionUpdateResult.data) && sessionUpdateResult.data.length > 0
          ? sessionUpdateResult.data[0]
          : sessionCheck.row

      return json(201, {
        ok: true,
        upserted: "created",
        tenantId: scope.tenantId,
        establishmentId,
        diagnosisSessionId,
        membershipRole: scope.role,
        session: {
          id: refreshedSessionRow.id,
          department_id: refreshedSessionRow.department_id,
          activity_id: refreshedSessionRow.activity_id,
          current_stage: refreshedSessionRow.current_stage,
          overall_status: refreshedSessionRow.overall_status,
          progress_percent: refreshedSessionRow.progress_percent,
        },
        item: {
          id: row.id,
          tenant_id: row.tenant_id,
          diagnosis_session_id: row.diagnosis_session_id,
          confirmed_exposed_group_json: row.confirmed_exposed_group_json,
          confirmed_hazards_json: row.confirmed_hazards_json,
          preliminary_priority: row.preliminary_priority,
          reviewed_at: row.reviewed_at,
          reviewed_by: row.reviewed_by,
          reviewer_comment: row.reviewer_comment,
          created_at: row.created_at,
          updated_at: row.updated_at,
        },
      })
    }

    if (existingRows.length > 1) {
      return json(409, {
        ok: false,
        error: "nr1_diagnosis_review_duplicate",
        message: "Expected 1 diagnosis review row, got " + String(existingRows.length),
      })
    }

    const existingRow = existingRows[0]

    const updateResult = await userClient
      .from("nr1_diagnosis_review")
      .update(payload)
      .eq("id", existingRow.id)
      .select("*")

    if (updateResult.error) {
      return json(500, {
        ok: false,
        error: "nr1_diagnosis_review_update_failed",
        message: updateResult.error.message,
      })
    }

    const rows = (updateResult.data || []) as Nr1DiagnosisReviewRow[]

    if (rows.length !== 1) {
      return json(500, {
        ok: false,
        error: "nr1_diagnosis_review_update_invalid_result",
        message: "Expected 1 updated row, got " + String(rows.length),
      })
    }

    const row = rows[0]

    const sessionUpdateResult = await userClient
      .from("nr1_diagnosis_sessions")
      .update(sessionPromotionPayload)
      .eq("id", sessionCheck.row.id)
      .select("*")

    if (sessionUpdateResult.error) {
      return json(500, {
        ok: false,
        error: "nr1_diagnosis_session_promote_after_review_failed",
        message: sessionUpdateResult.error.message,
      })
    }

    const refreshedSessionRow =
      Array.isArray(sessionUpdateResult.data) && sessionUpdateResult.data.length > 0
        ? sessionUpdateResult.data[0]
        : sessionCheck.row

    return json(200, {
      ok: true,
      upserted: "updated",
      tenantId: scope.tenantId,
      establishmentId,
      diagnosisSessionId,
      membershipRole: scope.role,
      session: {
        id: refreshedSessionRow.id,
        department_id: refreshedSessionRow.department_id,
        activity_id: refreshedSessionRow.activity_id,
        current_stage: refreshedSessionRow.current_stage,
        overall_status: refreshedSessionRow.overall_status,
        progress_percent: refreshedSessionRow.progress_percent,
      },
      item: {
        id: row.id,
        tenant_id: row.tenant_id,
        diagnosis_session_id: row.diagnosis_session_id,
        confirmed_exposed_group_json: row.confirmed_exposed_group_json,
        confirmed_hazards_json: row.confirmed_hazards_json,
        preliminary_priority: row.preliminary_priority,
        reviewed_at: row.reviewed_at,
        reviewed_by: row.reviewed_by,
        reviewer_comment: row.reviewer_comment,
        created_at: row.created_at,
        updated_at: row.updated_at,
      },
    })
  } catch (error) {
    const response = nr1ErrorToResponsePayload(error)
    return json(response.status, response.body)
  }
}
