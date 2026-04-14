import { NextRequest, NextResponse } from "next/server"
import type {
  Nr1DiagnosisSessionInsert,
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

type CreateDiagnosisSessionBody = {
  establishment_id?: string
  department_id?: string
  activity_id?: string
  current_stage?: string | null
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

function getRequiredActivityId(req: NextRequest): string | null {
  const value = (req.nextUrl.searchParams.get("activityId") || "").trim()
  return value || null
}

function getOptionalDepartmentId(req: NextRequest): string | null {
  const value = (req.nextUrl.searchParams.get("departmentId") || "").trim()
  return value || null
}

function getIncludeClosed(req: NextRequest): boolean {
  const value = (req.nextUrl.searchParams.get("includeClosed") || "").trim().toLowerCase()
  return value === "1" || value === "true" || value === "yes"
}

function cleanText(value: unknown): string | null {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function cleanCurrentStage(value: unknown): string {
  const cleaned = cleanText(value)
  return cleaned ?? "context"
}

function isOpenDiagnosisStatus(value: string | null | undefined): boolean {
  return value === "not_started" || value === "in_progress" || value === "review_pending"
}

async function requireActivityInScope(
  userClient: ReturnType<typeof createNr1UserClientFromBearer>,
  tenantId: string,
  establishmentId: string,
  departmentId: string,
  activityId: string,
) {
  const result = await userClient
    .from("nr1_activities")
    .select("id, tenant_id, establishment_id, department_id, name, status")
    .eq("id", activityId)
    .eq("tenant_id", tenantId)
    .eq("establishment_id", establishmentId)
    .eq("department_id", departmentId)
    .is("deleted_at", null)

  if (result.error) {
    return {
      ok: false as const,
      status: 500,
      error: "nr1_activity_lookup_failed",
      message: result.error.message,
    }
  }

  const rows = result.data ?? []

  if (rows.length === 0) {
    return {
      ok: false as const,
      status: 404,
      error: "nr1_activity_not_found",
      message: "No nr1_activities row found for tenant_id + establishment_id + department_id + activity_id",
    }
  }

  if (rows.length > 1) {
    return {
      ok: false as const,
      status: 409,
      error: "nr1_activity_duplicate",
      message: "Expected 1 activity row, got " + String(rows.length),
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
    const activityId = getRequiredActivityId(req)
    const departmentId = getOptionalDepartmentId(req)

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

    if (!activityId) {
      return json(400, {
        ok: false,
        error: "missing_activity_id",
        message: "Provide activityId in querystring",
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
    const includeClosed = getIncludeClosed(req)

    let query = userClient
      .from("nr1_diagnosis_sessions")
      .select("*")
      .eq("tenant_id", scope.tenantId)
      .eq("establishment_id", establishmentId)
      .eq("activity_id", activityId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })

    if (departmentId) {
      query = query.eq("department_id", departmentId)
    }

    const result = await query
    if (result.error) {
      return json(500, {
        ok: false,
        error: "nr1_diagnosis_sessions_list_failed",
        message: result.error.message,
      })
    }

    let rows = (result.data || []) as Nr1DiagnosisSessionRow[]

    if (!includeClosed) {
      rows = rows.filter((row) => isOpenDiagnosisStatus(row.overall_status))
    }

    return json(200, {
      ok: true,
      tenantId: scope.tenantId,
      establishmentId,
      activityId,
      departmentId: departmentId ?? null,
      membershipRole: scope.role,
      count: rows.length,
      items: rows.map((row) => ({
        id: row.id,
        tenant_id: row.tenant_id,
        establishment_id: row.establishment_id,
        department_id: row.department_id,
        activity_id: row.activity_id,
        current_stage: row.current_stage,
        overall_status: row.overall_status,
        progress_percent: row.progress_percent,
        started_at: row.started_at,
        last_saved_at: row.last_saved_at,
        completed_at: row.completed_at,
        approved_at: row.approved_at,
        reopened_at: row.reopened_at,
        created_at: row.created_at,
        updated_at: row.updated_at,
      })),
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

    let body: CreateDiagnosisSessionBody
    try {
      body = (await req.json()) as CreateDiagnosisSessionBody
    } catch {
      return json(400, {
        ok: false,
        error: "invalid_json",
        message: "Request body must be valid JSON",
      })
    }

    const establishmentId = cleanText(body.establishment_id)
    const departmentId = cleanText(body.department_id)
    const activityId = cleanText(body.activity_id)

    if (!establishmentId) {
      return json(400, {
        ok: false,
        error: "missing_establishment_id",
        message: "establishment_id is required",
      })
    }

    if (!departmentId) {
      return json(400, {
        ok: false,
        error: "missing_department_id",
        message: "department_id is required",
      })
    }

    if (!activityId) {
      return json(400, {
        ok: false,
        error: "missing_activity_id",
        message: "activity_id is required",
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
        error: "nr1_diagnosis_sessions_create_forbidden",
        message: "Only owner or admin can create diagnosis sessions",
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

    const activityCheck = await requireActivityInScope(
      userClient,
      scope.tenantId,
      establishmentId,
      departmentId,
      activityId,
    )

    if (!activityCheck.ok) {
      return json(activityCheck.status, {
        ok: false,
        error: activityCheck.error,
        message: activityCheck.message,
      })
    }

    const existingOpenResult = await userClient
      .from("nr1_diagnosis_sessions")
      .select("*")
      .eq("tenant_id", scope.tenantId)
      .eq("establishment_id", establishmentId)
      .eq("department_id", departmentId)
      .eq("activity_id", activityId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })

    if (existingOpenResult.error) {
      return json(500, {
        ok: false,
        error: "nr1_diagnosis_sessions_existing_lookup_failed",
        message: existingOpenResult.error.message,
      })
    }

    const existingOpenRows = ((existingOpenResult.data || []) as Nr1DiagnosisSessionRow[])
      .filter((row) => isOpenDiagnosisStatus(row.overall_status))

    if (existingOpenRows.length > 0) {
      const row = existingOpenRows[0]

      return json(200, {
        ok: true,
        reused: true,
        tenantId: scope.tenantId,
        establishmentId,
        departmentId,
        activityId,
        membershipRole: scope.role,
        item: {
          id: row.id,
          tenant_id: row.tenant_id,
          establishment_id: row.establishment_id,
          department_id: row.department_id,
          activity_id: row.activity_id,
          current_stage: row.current_stage,
          overall_status: row.overall_status,
          progress_percent: row.progress_percent,
          started_at: row.started_at,
          last_saved_at: row.last_saved_at,
          completed_at: row.completed_at,
          approved_at: row.approved_at,
          reopened_at: row.reopened_at,
          created_at: row.created_at,
          updated_at: row.updated_at,
        },
      })
    }

    const nowIso = new Date().toISOString()

    const payload: Nr1DiagnosisSessionInsert = {
      tenant_id: scope.tenantId,
      establishment_id: establishmentId,
      department_id: departmentId,
      activity_id: activityId,
      current_stage: cleanCurrentStage(body.current_stage),
      overall_status: "in_progress",
      progress_percent: 0,
      started_at: nowIso,
      last_saved_at: nowIso,
    }

    const insertResult = await userClient
      .from("nr1_diagnosis_sessions")
      .insert(payload)
      .select("*")

    if (insertResult.error) {
      return json(500, {
        ok: false,
        error: "nr1_diagnosis_session_create_failed",
        message: insertResult.error.message,
      })
    }

    const rows = (insertResult.data || []) as Nr1DiagnosisSessionRow[]

    if (rows.length !== 1) {
      return json(500, {
        ok: false,
        error: "nr1_diagnosis_session_create_invalid_result",
        message: "Expected 1 inserted row, got " + String(rows.length),
      })
    }

    const row = rows[0]

    return json(201, {
      ok: true,
      reused: false,
      tenantId: scope.tenantId,
      establishmentId,
      departmentId,
      activityId,
      membershipRole: scope.role,
      item: {
        id: row.id,
        tenant_id: row.tenant_id,
        establishment_id: row.establishment_id,
        department_id: row.department_id,
        activity_id: row.activity_id,
        current_stage: row.current_stage,
        overall_status: row.overall_status,
        progress_percent: row.progress_percent,
        started_at: row.started_at,
        last_saved_at: row.last_saved_at,
        completed_at: row.completed_at,
        approved_at: row.approved_at,
        reopened_at: row.reopened_at,
        created_at: row.created_at,
        updated_at: row.updated_at,
      },
    })
  } catch (error) {
    const response = nr1ErrorToResponsePayload(error)
    return json(response.status, response.body)
  }
}