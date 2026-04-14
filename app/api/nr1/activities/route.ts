import { NextRequest, NextResponse } from "next/server"
import type {
  Nr1ActivityInsert,
  Nr1ActivityRow,
} from "@/lib/nr1-db-types"
import {
  createNr1UserClientFromBearer,
  extractBearerToken,
  isTenantAdminRole,
  nr1ErrorToResponsePayload,
  resolveNr1Scope,
} from "@/lib/server/nr1-scope"

export const dynamic = "force-dynamic"

type CreateActivityBody = {
  establishment_id?: string
  department_id?: string
  name?: string
  real_activity_description?: string | null
  frequency?: string | null
  exposed_worker_count?: number | null
  execution_location?: string | null
  uses_machine?: boolean
  uses_chemical?: boolean
  has_public_contact?: boolean
  has_third_party_interaction?: boolean
  notes?: string | null
  status?: "draft" | "ready_for_diagnosis" | "diagnosed" | "review_pending"
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

function getOptionalDepartmentId(req: NextRequest): string | null {
  const queryValue = (req.nextUrl.searchParams.get("departmentId") || "").trim()
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

function cleanBoolean(value: unknown, fallback = false): boolean {
  return typeof value === "boolean" ? value : fallback
}

function cleanStatus(value: unknown): "draft" | "ready_for_diagnosis" | "diagnosed" | "review_pending" {
  if (
    value === "draft" ||
    value === "ready_for_diagnosis" ||
    value === "diagnosed" ||
    value === "review_pending"
  ) {
    return value
  }

  return "draft"
}

async function requireDepartmentInTenantAndEstablishment(
  userClient: ReturnType<typeof createNr1UserClientFromBearer>,
  tenantId: string,
  establishmentId: string,
  departmentId: string,
) {
  const result = await userClient
    .from("nr1_departments")
    .select("id, tenant_id, establishment_id, name, status")
    .eq("id", departmentId)
    .eq("tenant_id", tenantId)
    .eq("establishment_id", establishmentId)
    .is("deleted_at", null)

  if (result.error) {
    return {
      ok: false as const,
      status: 500,
      error: "nr1_department_lookup_failed",
      message: result.error.message,
    }
  }

  const rows = result.data ?? []

  if (rows.length === 0) {
    return {
      ok: false as const,
      status: 404,
      error: "nr1_department_not_found",
      message: "No nr1_departments row found for tenant_id + establishment_id + department_id",
    }
  }

  if (rows.length > 1) {
    return {
      ok: false as const,
      status: 409,
      error: "nr1_department_duplicate",
      message: "Expected 1 department row, got " + String(rows.length),
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
      .from("nr1_activities")
      .select("*")
      .eq("tenant_id", scope.tenantId)
      .eq("establishment_id", establishmentId)
      .order("name", { ascending: true })

    if (!includeArchived) {
      query = query.is("deleted_at", null)
    }

    if (departmentId) {
      query = query.eq("department_id", departmentId)
    }

    const result = await query
    if (result.error) {
      return json(500, {
        ok: false,
        error: "nr1_activities_list_failed",
        message: result.error.message,
      })
    }

    const rows = (result.data || []) as Nr1ActivityRow[]

    return json(200, {
      ok: true,
      tenantId: scope.tenantId,
      establishmentId,
      departmentId: departmentId ?? null,
      membershipRole: scope.role,
      count: rows.length,
      items: rows.map((row) => ({
        id: row.id,
        tenant_id: row.tenant_id,
        establishment_id: row.establishment_id,
        department_id: row.department_id,
        name: row.name,
        real_activity_description: row.real_activity_description,
        frequency: row.frequency,
        exposed_worker_count: row.exposed_worker_count,
        execution_location: row.execution_location,
        uses_machine: row.uses_machine,
        uses_chemical: row.uses_chemical,
        has_public_contact: row.has_public_contact,
        has_third_party_interaction: row.has_third_party_interaction,
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

    let body: CreateActivityBody
    try {
      body = (await req.json()) as CreateActivityBody
    } catch {
      return json(400, {
        ok: false,
        error: "invalid_json",
        message: "Request body must be valid JSON",
      })
    }

    const establishmentId = cleanText(body.establishment_id)
    const departmentId = cleanText(body.department_id)

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

    const scope = await resolveNr1Scope({
      req,
      tenantId,
      establishmentId,
    })

    if (!isTenantAdminRole(scope.role)) {
      return json(403, {
        ok: false,
        error: "nr1_activities_create_forbidden",
        message: "Only owner or admin can create activities",
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

    const departmentCheck = await requireDepartmentInTenantAndEstablishment(
      userClient,
      scope.tenantId,
      establishmentId,
      departmentId,
    )

    if (!departmentCheck.ok) {
      return json(departmentCheck.status, {
        ok: false,
        error: departmentCheck.error,
        message: departmentCheck.message,
      })
    }

    const payload: Nr1ActivityInsert = {
      tenant_id: scope.tenantId,
      establishment_id: establishmentId,
      department_id: departmentId,
      name,
      real_activity_description: cleanText(body.real_activity_description),
      frequency: cleanText(body.frequency),
      exposed_worker_count: cleanNullableNumber(body.exposed_worker_count),
      execution_location: cleanText(body.execution_location),
      uses_machine: cleanBoolean(body.uses_machine, false),
      uses_chemical: cleanBoolean(body.uses_chemical, false),
      has_public_contact: cleanBoolean(body.has_public_contact, false),
      has_third_party_interaction: cleanBoolean(body.has_third_party_interaction, false),
      notes: cleanText(body.notes),
      status: cleanStatus(body.status),
    }

    const insertResult = await userClient
      .from("nr1_activities")
      .insert(payload)
      .select("*")

    if (insertResult.error) {
      return json(500, {
        ok: false,
        error: "nr1_activity_create_failed",
        message: insertResult.error.message,
      })
    }

    const rows = (insertResult.data || []) as Nr1ActivityRow[]

    if (rows.length !== 1) {
      return json(500, {
        ok: false,
        error: "nr1_activity_create_invalid_result",
        message: "Expected 1 inserted row, got " + String(rows.length),
      })
    }

    const row = rows[0]

    return json(201, {
      ok: true,
      tenantId: scope.tenantId,
      establishmentId,
      departmentId,
      membershipRole: scope.role,
      item: {
        id: row.id,
        tenant_id: row.tenant_id,
        establishment_id: row.establishment_id,
        department_id: row.department_id,
        name: row.name,
        real_activity_description: row.real_activity_description,
        frequency: row.frequency,
        exposed_worker_count: row.exposed_worker_count,
        execution_location: row.execution_location,
        uses_machine: row.uses_machine,
        uses_chemical: row.uses_chemical,
        has_public_contact: row.has_public_contact,
        has_third_party_interaction: row.has_third_party_interaction,
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