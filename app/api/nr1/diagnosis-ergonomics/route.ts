import { NextRequest, NextResponse } from "next/server"
import type {
  Nr1DiagnosisErgonomicsRow,
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

type UpsertDiagnosisErgonomicsBody = {
  establishment_id?: string
  diagnosis_session_id?: string
  has_prolonged_sitting?: boolean | null
  has_prolonged_standing?: boolean | null
  has_forced_posture?: boolean | null
  has_repetitive_movements?: boolean | null
  has_manual_handling?: boolean | null
  furniture_adequacy?: string | null
  lighting_adequacy?: string | null
  thermal_discomfort?: boolean | null
  acoustic_discomfort?: boolean | null
  has_existing_aep?: boolean | null
  notes?: string | null
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

function cleanBooleanOrNull(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null
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
      .from("nr1_diagnosis_ergonomics")
      .select("*")
      .eq("tenant_id", scope.tenantId)
      .eq("diagnosis_session_id", diagnosisSessionId)

    if (result.error) {
      return json(500, {
        ok: false,
        error: "nr1_diagnosis_ergonomics_get_failed",
        message: result.error.message,
      })
    }

    const rows = (result.data || []) as Nr1DiagnosisErgonomicsRow[]

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
        error: "nr1_diagnosis_ergonomics_duplicate",
        message: "Expected 1 diagnosis ergonomics row, got " + String(rows.length),
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
        has_prolonged_sitting: row.has_prolonged_sitting,
        has_prolonged_standing: row.has_prolonged_standing,
        has_forced_posture: row.has_forced_posture,
        has_repetitive_movements: row.has_repetitive_movements,
        has_manual_handling: row.has_manual_handling,
        furniture_adequacy: row.furniture_adequacy,
        lighting_adequacy: row.lighting_adequacy,
        thermal_discomfort: row.thermal_discomfort,
        acoustic_discomfort: row.acoustic_discomfort,
        has_existing_aep: row.has_existing_aep,
        notes: row.notes,
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

    let body: UpsertDiagnosisErgonomicsBody
    try {
      body = (await req.json()) as UpsertDiagnosisErgonomicsBody
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
        error: "nr1_diagnosis_ergonomics_upsert_forbidden",
        message: "Only owner or admin can upsert diagnosis ergonomics",
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
      .from("nr1_diagnosis_ergonomics")
      .select("*")
      .eq("tenant_id", scope.tenantId)
      .eq("diagnosis_session_id", diagnosisSessionId)

    if (existingResult.error) {
      return json(500, {
        ok: false,
        error: "nr1_diagnosis_ergonomics_existing_lookup_failed",
        message: existingResult.error.message,
      })
    }

    const existingRows = (existingResult.data || []) as Nr1DiagnosisErgonomicsRow[]

    const payload = {
      tenant_id: scope.tenantId,
      diagnosis_session_id: diagnosisSessionId,
      has_prolonged_sitting: cleanBooleanOrNull(body.has_prolonged_sitting),
      has_prolonged_standing: cleanBooleanOrNull(body.has_prolonged_standing),
      has_forced_posture: cleanBooleanOrNull(body.has_forced_posture),
      has_repetitive_movements: cleanBooleanOrNull(body.has_repetitive_movements),
      has_manual_handling: cleanBooleanOrNull(body.has_manual_handling),
      furniture_adequacy: cleanText(body.furniture_adequacy),
      lighting_adequacy: cleanText(body.lighting_adequacy),
      thermal_discomfort: cleanBooleanOrNull(body.thermal_discomfort),
      acoustic_discomfort: cleanBooleanOrNull(body.acoustic_discomfort),
      has_existing_aep: cleanBooleanOrNull(body.has_existing_aep),
      notes: cleanText(body.notes),
    }

    if (existingRows.length === 0) {
      const insertResult = await userClient
        .from("nr1_diagnosis_ergonomics")
        .insert(payload)
        .select("*")

      if (insertResult.error) {
        return json(500, {
          ok: false,
          error: "nr1_diagnosis_ergonomics_create_failed",
          message: insertResult.error.message,
        })
      }

      const rows = (insertResult.data || []) as Nr1DiagnosisErgonomicsRow[]

      if (rows.length !== 1) {
        return json(500, {
          ok: false,
          error: "nr1_diagnosis_ergonomics_create_invalid_result",
          message: "Expected 1 inserted row, got " + String(rows.length),
        })
      }

      const row = rows[0]

      return json(201, {
        ok: true,
        upserted: "created",
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
          has_prolonged_sitting: row.has_prolonged_sitting,
          has_prolonged_standing: row.has_prolonged_standing,
          has_forced_posture: row.has_forced_posture,
          has_repetitive_movements: row.has_repetitive_movements,
          has_manual_handling: row.has_manual_handling,
          furniture_adequacy: row.furniture_adequacy,
          lighting_adequacy: row.lighting_adequacy,
          thermal_discomfort: row.thermal_discomfort,
          acoustic_discomfort: row.acoustic_discomfort,
          has_existing_aep: row.has_existing_aep,
          notes: row.notes,
          created_at: row.created_at,
          updated_at: row.updated_at,
        },
      })
    }

    if (existingRows.length > 1) {
      return json(409, {
        ok: false,
        error: "nr1_diagnosis_ergonomics_duplicate",
        message: "Expected 1 diagnosis ergonomics row, got " + String(existingRows.length),
      })
    }

    const existingRow = existingRows[0]

    const updateResult = await userClient
      .from("nr1_diagnosis_ergonomics")
      .update(payload)
      .eq("id", existingRow.id)
      .select("*")

    if (updateResult.error) {
      return json(500, {
        ok: false,
        error: "nr1_diagnosis_ergonomics_update_failed",
        message: updateResult.error.message,
      })
    }

    const rows = (updateResult.data || []) as Nr1DiagnosisErgonomicsRow[]

    if (rows.length !== 1) {
      return json(500, {
        ok: false,
        error: "nr1_diagnosis_ergonomics_update_invalid_result",
        message: "Expected 1 updated row, got " + String(rows.length),
      })
    }

    const row = rows[0]

    return json(200, {
      ok: true,
      upserted: "updated",
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
        has_prolonged_sitting: row.has_prolonged_sitting,
        has_prolonged_standing: row.has_prolonged_standing,
        has_forced_posture: row.has_forced_posture,
        has_repetitive_movements: row.has_repetitive_movements,
        has_manual_handling: row.has_manual_handling,
        furniture_adequacy: row.furniture_adequacy,
        lighting_adequacy: row.lighting_adequacy,
        thermal_discomfort: row.thermal_discomfort,
        acoustic_discomfort: row.acoustic_discomfort,
        has_existing_aep: row.has_existing_aep,
        notes: row.notes,
        created_at: row.created_at,
        updated_at: row.updated_at,
      },
    })
  } catch (error) {
    const response = nr1ErrorToResponsePayload(error)
    return json(response.status, response.body)
  }
}