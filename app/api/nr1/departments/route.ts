import { NextRequest, NextResponse } from "next/server"
import type {
  Nr1DepartmentInsert,
  Nr1DepartmentRow,
} from "@/lib/nr1-db-types"
import {
  createNr1UserClientFromBearer,
  extractBearerToken,
  isTenantAdminRole,
  nr1ErrorToResponsePayload,
  resolveNr1Scope,
} from "@/lib/server/nr1-scope"

export const dynamic = "force-dynamic"

type CreateDepartmentBody = {
  establishment_id?: string
  name?: string
  description?: string | null
  employee_count?: number | null
  shift_pattern?: string | null
  has_direct_leadership?: boolean | null
  has_public_contact?: boolean | null
  has_deadline_pressure?: boolean | null
  has_repetitive_work?: boolean | null
  has_prolonged_sitting?: boolean | null
  has_relevant_physical_effort?: boolean | null
  has_frequent_displacement?: boolean | null
  notes?: string | null
  status?: "draft" | "active" | "archived"
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
  const queryValue = (req.nextUrl.searchParams.get("establishmentId") || "").trim()
  return queryValue || null
}

function getIncludeArchived(req: NextRequest): boolean {
  const value = (req.nextUrl.searchParams.get("includeArchived") || "").trim().toLowerCase()
  return value === "1" || value === "true" || value === "yes"
}

function cleanText(value: unknown): string | null {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function cleanNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null
  if (typeof value === "number" && Number.isFinite(value)) return value
  return null
}

function cleanBooleanOrNull(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null
}

function cleanStatus(value: unknown): "draft" | "active" | "archived" {
  if (value === "draft" || value === "active" || value === "archived") {
    return value
  }
  return "active"
}

export async function GET(req: NextRequest) {
  try {
    const tenantId = getTenantId(req)
    const establishmentId = getRequiredEstablishmentId(req)

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
    const includeArchived = getIncludeArchived(req)

    let query = userClient
      .from("nr1_departments")
      .select("*")
      .eq("tenant_id", scope.tenantId)
      .eq("establishment_id", establishmentId)
      .order("name", { ascending: true })

    if (!includeArchived) {
      query = query
        .is("deleted_at", null)
        .neq("status", "archived")
    }

    const result = await query
    if (result.error) {
      return json(500, {
        ok: false,
        error: "nr1_departments_list_failed",
        message: result.error.message,
      })
    }

    const rows = (result.data || []) as Nr1DepartmentRow[]

    return json(200, {
      ok: true,
      tenantId: scope.tenantId,
      establishmentId,
      membershipRole: scope.role,
      count: rows.length,
      items: rows.map((row) => ({
        id: row.id,
        tenant_id: row.tenant_id,
        establishment_id: row.establishment_id,
        name: row.name,
        description: row.description,
        employee_count: row.employee_count,
        shift_pattern: row.shift_pattern,
        has_direct_leadership: row.has_direct_leadership,
        has_public_contact: row.has_public_contact,
        has_deadline_pressure: row.has_deadline_pressure,
        has_repetitive_work: row.has_repetitive_work,
        has_prolonged_sitting: row.has_prolonged_sitting,
        has_relevant_physical_effort: row.has_relevant_physical_effort,
        has_frequent_displacement: row.has_frequent_displacement,
        notes: row.notes,
        status: row.status,
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

    let body: CreateDepartmentBody
    try {
      body = (await req.json()) as CreateDepartmentBody
    } catch {
      return json(400, {
        ok: false,
        error: "invalid_json",
        message: "Request body must be valid JSON",
      })
    }

    const establishmentId = cleanText(body.establishment_id)

    if (!establishmentId) {
      return json(400, {
        ok: false,
        error: "missing_establishment_id",
        message: "establishment_id is required",
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
        error: "nr1_departments_create_forbidden",
        message: "Only owner or admin can create departments",
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

    const name = cleanText(body.name)

    if (!name || name.length < 3) {
      return json(400, {
        ok: false,
        error: "invalid_name",
        message: "name is required and must have at least 3 characters",
      })
    }

    const userClient = createNr1UserClientFromBearer(bearerToken)

    const payload: Nr1DepartmentInsert = {
      tenant_id: scope.tenantId,
      establishment_id: establishmentId,
      name,
      description: cleanText(body.description),
      employee_count: cleanNullableNumber(body.employee_count),
      shift_pattern: cleanText(body.shift_pattern),
      has_direct_leadership: cleanBooleanOrNull(body.has_direct_leadership),
      has_public_contact: cleanBooleanOrNull(body.has_public_contact),
      has_deadline_pressure: cleanBooleanOrNull(body.has_deadline_pressure),
      has_repetitive_work: cleanBooleanOrNull(body.has_repetitive_work),
      has_prolonged_sitting: cleanBooleanOrNull(body.has_prolonged_sitting),
      has_relevant_physical_effort: cleanBooleanOrNull(body.has_relevant_physical_effort),
      has_frequent_displacement: cleanBooleanOrNull(body.has_frequent_displacement),
      notes: cleanText(body.notes),
      status: cleanStatus(body.status),
    }

    const insertResult = await userClient
      .from("nr1_departments")
      .insert(payload)
      .select("*")

    if (insertResult.error) {
      return json(500, {
        ok: false,
        error: "nr1_department_create_failed",
        message: insertResult.error.message,
      })
    }

    const rows = (insertResult.data || []) as Nr1DepartmentRow[]

    if (rows.length !== 1) {
      return json(500, {
        ok: false,
        error: "nr1_department_create_invalid_result",
        message: "Expected 1 inserted row, got " + String(rows.length),
      })
    }

    const row = rows[0]

    return json(201, {
      ok: true,
      tenantId: scope.tenantId,
      establishmentId,
      membershipRole: scope.role,
      item: {
        id: row.id,
        tenant_id: row.tenant_id,
        establishment_id: row.establishment_id,
        name: row.name,
        description: row.description,
        employee_count: row.employee_count,
        shift_pattern: row.shift_pattern,
        has_direct_leadership: row.has_direct_leadership,
        has_public_contact: row.has_public_contact,
        has_deadline_pressure: row.has_deadline_pressure,
        has_repetitive_work: row.has_repetitive_work,
        has_prolonged_sitting: row.has_prolonged_sitting,
        has_relevant_physical_effort: row.has_relevant_physical_effort,
        has_frequent_displacement: row.has_frequent_displacement,
        notes: row.notes,
        status: row.status,
        created_at: row.created_at,
        updated_at: row.updated_at,
      },
    })
  } catch (error) {
    const response = nr1ErrorToResponsePayload(error)
    return json(response.status, response.body)
  }
}