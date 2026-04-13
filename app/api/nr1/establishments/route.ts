import { NextRequest, NextResponse } from "next/server"
import type {
  Nr1EstablishmentInsert,
  Nr1EstablishmentRow,
} from "@/lib/nr1-db-types"
import {
  createNr1UserClientFromBearer,
  extractBearerToken,
  isTenantAdminRole,
  nr1ErrorToResponsePayload,
  resolveNr1Scope,
} from "@/lib/server/nr1-scope"

export const dynamic = "force-dynamic"

type CreateEstablishmentBody = {
  company_id?: string
  name?: string
  establishment_type?: string | null
  cnpj_unit?: string | null
  cep?: string | null
  address?: string | null
  number?: string | null
  complement?: string | null
  district?: string | null
  city?: string | null
  state?: string | null
  employee_count?: number | null
  has_third_parties?: boolean
  has_external_activities?: boolean
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

function getOptionalCompanyId(req: NextRequest): string | null {
  const value = (req.nextUrl.searchParams.get("companyId") || "").trim()
  return value ? value : null
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

function cleanStatus(value: unknown): "draft" | "active" | "archived" {
  if (value === "draft" || value === "active" || value === "archived") {
    return value
  }
  return "active"
}

async function requireCompanyInTenant(
  userClient: ReturnType<typeof createNr1UserClientFromBearer>,
  tenantId: string,
  companyId: string,
) {
  const result = await userClient
    .from("nr1_companies")
    .select("id, tenant_id, legal_name, trade_name, status")
    .eq("id", companyId)
    .eq("tenant_id", tenantId)
    .is("deleted_at", null)

  if (result.error) {
    return {
      ok: false as const,
      status: 500,
      error: "nr1_company_lookup_failed",
      message: result.error.message,
    }
  }

  const rows = result.data ?? []

  if (rows.length === 0) {
    return {
      ok: false as const,
      status: 404,
      error: "nr1_company_not_found",
      message: "No nr1_companies row found for tenant_id + company_id",
    }
  }

  if (rows.length > 1) {
    return {
      ok: false as const,
      status: 409,
      error: "nr1_company_duplicate",
      message: "Expected 1 company row, got " + String(rows.length),
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

    if (!tenantId) {
      return json(400, {
        ok: false,
        error: "missing_tenant_id",
        message: "Provide tenantId in querystring or x-icanhelp-tenant header",
      })
    }

    const scope = await resolveNr1Scope({
      req,
      tenantId,
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
    const companyId = getOptionalCompanyId(req)

    let query = userClient
      .from("nr1_establishments")
      .select("*")
      .eq("tenant_id", scope.tenantId)
      .order("name", { ascending: true })

    if (!includeArchived) {
      query = query
        .is("deleted_at", null)
        .neq("status", "archived")
    }

    if (companyId) {
      query = query.eq("company_id", companyId)
    }

    const result = await query
    if (result.error) {
      return json(500, {
        ok: false,
        error: "nr1_establishments_list_failed",
        message: result.error.message,
      })
    }

    const rows = (result.data || []) as Nr1EstablishmentRow[]

    return json(200, {
      ok: true,
      tenantId: scope.tenantId,
      membershipRole: scope.role,
      count: rows.length,
      items: rows.map((row) => ({
        id: row.id,
        tenant_id: row.tenant_id,
        company_id: row.company_id,
        name: row.name,
        establishment_type: row.establishment_type,
        cnpj_unit: row.cnpj_unit,
        city: row.city,
        state: row.state,
        employee_count: row.employee_count,
        has_third_parties: row.has_third_parties,
        has_external_activities: row.has_external_activities,
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

    const scope = await resolveNr1Scope({
      req,
      tenantId,
    })

    if (!isTenantAdminRole(scope.role)) {
      return json(403, {
        ok: false,
        error: "nr1_establishments_create_forbidden",
        message: "Only owner or admin can create establishments",
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

    let body: CreateEstablishmentBody
    try {
      body = (await req.json()) as CreateEstablishmentBody
    } catch {
      return json(400, {
        ok: false,
        error: "invalid_json",
        message: "Request body must be valid JSON",
      })
    }

    const companyId = cleanText(body.company_id)
    const name = cleanText(body.name)

    if (!companyId) {
      return json(400, {
        ok: false,
        error: "missing_company_id",
        message: "company_id is required",
      })
    }

    if (!name || name.length < 3) {
      return json(400, {
        ok: false,
        error: "invalid_name",
        message: "name is required and must have at least 3 characters",
      })
    }

    const userClient = createNr1UserClientFromBearer(bearerToken)

    const companyCheck = await requireCompanyInTenant(userClient, scope.tenantId, companyId)
    if (!companyCheck.ok) {
      return json(companyCheck.status, {
        ok: false,
        error: companyCheck.error,
        message: companyCheck.message,
      })
    }

    const payload: Nr1EstablishmentInsert = {
      tenant_id: scope.tenantId,
      company_id: companyId,
      name,
      establishment_type: cleanText(body.establishment_type),
      cnpj_unit: cleanText(body.cnpj_unit),
      cep: cleanText(body.cep),
      address: cleanText(body.address),
      number: cleanText(body.number),
      complement: cleanText(body.complement),
      district: cleanText(body.district),
      city: cleanText(body.city),
      state: cleanText(body.state),
      employee_count: cleanNullableNumber(body.employee_count),
      has_third_parties: cleanBoolean(body.has_third_parties, false),
      has_external_activities: cleanBoolean(body.has_external_activities, false),
      notes: cleanText(body.notes),
      status: cleanStatus(body.status),
    }

    const insertResult = await userClient
      .from("nr1_establishments")
      .insert(payload)
      .select("*")

    if (insertResult.error) {
      return json(500, {
        ok: false,
        error: "nr1_establishment_create_failed",
        message: insertResult.error.message,
      })
    }

    const rows = (insertResult.data || []) as Nr1EstablishmentRow[]

    if (rows.length !== 1) {
      return json(500, {
        ok: false,
        error: "nr1_establishment_create_invalid_result",
        message: "Expected 1 inserted row, got " + String(rows.length),
      })
    }

    const row = rows[0]

    return json(201, {
      ok: true,
      tenantId: scope.tenantId,
      membershipRole: scope.role,
      item: {
        id: row.id,
        tenant_id: row.tenant_id,
        company_id: row.company_id,
        name: row.name,
        establishment_type: row.establishment_type,
        cnpj_unit: row.cnpj_unit,
        cep: row.cep,
        address: row.address,
        number: row.number,
        complement: row.complement,
        district: row.district,
        city: row.city,
        state: row.state,
        employee_count: row.employee_count,
        has_third_parties: row.has_third_parties,
        has_external_activities: row.has_external_activities,
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