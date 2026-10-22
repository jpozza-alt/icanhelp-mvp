import { NextRequest, NextResponse } from "next/server"
import type {
  Nr1CompanyInsert,
  Nr1CompanyRow,
  Nr1CompanyUpdate,
} from "@/lib/nr1-db-types"
import { canCreateNr1Company } from "@/lib/nr1-company-creation-access"
import { resolveTenantPlanFeatures } from "@/lib/server/tenant-plan-features"
import {
  createNr1UserClientFromBearer,
  extractBearerToken,
  isTenantAdminRole,
  nr1ErrorToResponsePayload,
  resolveNr1Scope,
} from "@/lib/server/nr1-scope"

export const dynamic = "force-dynamic"

type CreateCompanyBody = {
  legal_name?: string
  trade_name?: string | null
  cnpj?: string | null
  cnae_main?: string | null
  company_size?: string | null
  risk_grade?: string | null
  employee_count?: number | null
  has_cipa?: boolean
  has_sesmt?: boolean
  has_public_service?: boolean
  has_remote_work?: boolean
  has_third_parties?: boolean
  has_external_activities?: boolean
  status?: "incomplete" | "completed" | "outdated"
}

function json(status: number, payload: Record<string, unknown>) {
  return NextResponse.json(payload, { status })
}

function getTenantId(req: NextRequest): string {
  const queryValue = (req.nextUrl.searchParams.get("tenantId") || "").trim()
  const headerValue = (req.headers.get("x-icanhelp-tenant") || "").trim()

  return queryValue || headerValue
}

function getIncludeDeleted(req: NextRequest): boolean {
  const value = (req.nextUrl.searchParams.get("includeDeleted") || "").trim().toLowerCase()
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

function cleanStatus(value: unknown): "incomplete" | "completed" | "outdated" {
  if (value === "incomplete" || value === "completed" || value === "outdated") {
    return value
  }
  return "incomplete"
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
    const includeDeleted = getIncludeDeleted(req)

    let query = userClient
      .from("nr1_companies")
      .select("*")
      .eq("tenant_id", scope.tenantId)
      .order("legal_name", { ascending: true })

    if (!includeDeleted) {
      query = query.is("deleted_at", null)
    }

    const result = await query
    if (result.error) {
      return json(500, {
        ok: false,
        error: "nr1_companies_list_failed",
        message: result.error.message,
      })
    }

    const rows = (result.data || []) as Nr1CompanyRow[]

    // Inclui registros excluidos logicamente: clientes comuns possuem uma
    // unica empresa historica, nao uma nova empresa apos soft-delete.
    const countResult = await userClient
      .from("nr1_companies")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", scope.tenantId)

    if (countResult.error || countResult.count === null) {
      return json(500, { ok: false, error: "nr1_companies_count_failed" })
    }

    let portfolioEnabled = false
    let partnerModeEnabled = false
    if (countResult.count > 0 && isTenantAdminRole(scope.role)) {
      try {
        const entitlement = await resolveTenantPlanFeatures(scope.tenantId, userClient)
        const eligiblePlan = ["partner_sst", "pasini"].includes(
          String(entitlement.plan.slug || ""),
        )
        portfolioEnabled = entitlement.isEntitled && entitlement.planIsActive &&
          eligiblePlan && entitlement.featureFlags.multi_company_portfolio === true
        partnerModeEnabled = entitlement.isEntitled && entitlement.planIsActive &&
          eligiblePlan && entitlement.featureFlags.partner_mode === true
      } catch {
        // Falha de consulta do plano NAO libera nova empresa.
      }
    }

    return json(200, {
      ok: true,
      tenantId: scope.tenantId,
      membershipRole: scope.role,
      canCreateCompany: canCreateNr1Company({
        membershipRole: scope.role,
        companyCount: countResult.count,
        portfolioEnabled,
        partnerModeEnabled,
      }),
      count: rows.length,
      items: rows.map((row) => ({
        id: row.id,
        tenant_id: row.tenant_id,
        legal_name: row.legal_name,
        trade_name: row.trade_name,
        cnpj: row.cnpj,
        cnae_main: row.cnae_main,
        company_size: row.company_size,
        risk_grade: row.risk_grade,
        employee_count: row.employee_count,
        has_cipa: row.has_cipa,
        has_sesmt: row.has_sesmt,
        has_public_service: row.has_public_service,
        has_remote_work: row.has_remote_work,
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
        error: "nr1_companies_create_forbidden",
        message: "Only owner or admin can create companies",
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

    let body: CreateCompanyBody
    try {
      body = (await req.json()) as CreateCompanyBody
    } catch {
      return json(400, {
        ok: false,
        error: "invalid_json",
        message: "Request body must be valid JSON",
      })
    }

    const legalName = cleanText(body.legal_name)

    if (!legalName || legalName.length < 3) {
      return json(400, {
        ok: false,
        error: "invalid_legal_name",
        message: "legal_name is required and must have at least 3 characters",
      })
    }

    const userClient = createNr1UserClientFromBearer(bearerToken)

    const payload: Nr1CompanyInsert = {
      tenant_id: scope.tenantId,
      legal_name: legalName,
      trade_name: cleanText(body.trade_name),
      cnpj: cleanText(body.cnpj),
      cnae_main: cleanText(body.cnae_main),
      company_size: cleanText(body.company_size),
      risk_grade: cleanText(body.risk_grade),
      employee_count: cleanNullableNumber(body.employee_count),
      has_cipa: cleanBoolean(body.has_cipa, false),
      has_sesmt: cleanBoolean(body.has_sesmt, false),
      has_public_service: cleanBoolean(body.has_public_service, false),
      has_remote_work: cleanBoolean(body.has_remote_work, false),
      has_third_parties: cleanBoolean(body.has_third_parties, false),
      has_external_activities: cleanBoolean(body.has_external_activities, false),
      status: cleanStatus(body.status),
    }

    // Banco transacional: nao confiar no papel do tenant nem em contagem
    // anterior no frontend. O RPC valida auth, tenant, plano e concorrencia.
    const insertResult = await userClient.rpc("icanhelp_nr1_create_company", {
      p_tenant_id: scope.tenantId,
      p_legal_name: payload.legal_name,
      p_trade_name: payload.trade_name,
      p_cnpj: payload.cnpj,
      p_cnae_main: payload.cnae_main,
      p_company_size: payload.company_size,
      p_risk_grade: payload.risk_grade,
      p_employee_count: payload.employee_count,
      p_has_cipa: payload.has_cipa,
      p_has_sesmt: payload.has_sesmt,
      p_has_public_service: payload.has_public_service,
      p_has_remote_work: payload.has_remote_work,
      p_has_third_parties: payload.has_third_parties,
      p_has_external_activities: payload.has_external_activities,
      p_status: payload.status,
    })

    if (insertResult.error) {
      const denied = insertResult.error.message.includes("nr1_company_create_forbidden") ||
        insertResult.error.code === "42501"
      return json(denied ? 403 : 500, {
        ok: false,
        error: denied ? "nr1_companies_create_forbidden" : "nr1_company_create_failed",
        message: denied
          ? "Sua organizacao nao possui permissao para cadastrar outra empresa."
          : "Falha ao cadastrar a empresa. Confira o servidor ou migration pendente.",
      })
    }

    const rows = (insertResult.data || []) as Nr1CompanyRow[]

    if (rows.length !== 1) {
      return json(500, {
        ok: false,
        error: "nr1_company_create_invalid_result",
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
        legal_name: row.legal_name,
        trade_name: row.trade_name,
        cnpj: row.cnpj,
        cnae_main: row.cnae_main,
        company_size: row.company_size,
        risk_grade: row.risk_grade,
        employee_count: row.employee_count,
        has_cipa: row.has_cipa,
        has_sesmt: row.has_sesmt,
        has_public_service: row.has_public_service,
        has_remote_work: row.has_remote_work,
        has_third_parties: row.has_third_parties,
        has_external_activities: row.has_external_activities,
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

export async function PATCH(req: NextRequest) {
  try {
    const tenantId = getTenantId(req)
    const companyId = (req.nextUrl.searchParams.get("companyId") || "").trim()
    if (!tenantId) return json(400, { ok: false, error: "missing_tenant_id" })
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(companyId)) {
      return json(400, { ok: false, error: "invalid_company_id" })
    }

    const scope = await resolveNr1Scope({ req, tenantId })
    if (!isTenantAdminRole(scope.role)) {
      return json(403, { ok: false, error: "nr1_company_update_forbidden" })
    }
    const bearerToken = extractBearerToken(req)
    if (!bearerToken) return json(401, { ok: false, error: "missing_bearer" })

    let body: CreateCompanyBody
    try {
      body = (await req.json()) as CreateCompanyBody
      if (!body || typeof body !== "object" || Array.isArray(body)) {
        throw new Error("invalid_body")
      }
    } catch {
      return json(400, { ok: false, error: "invalid_json" })
    }
    const legalName = cleanText(body.legal_name)
    if (!legalName || legalName.length < 3) {
      return json(400, { ok: false, error: "invalid_legal_name" })
    }

    const payload: Nr1CompanyUpdate = {
      legal_name: legalName,
      trade_name: cleanText(body.trade_name),
      cnpj: cleanText(body.cnpj),
      cnae_main: cleanText(body.cnae_main),
      company_size: cleanText(body.company_size),
      risk_grade: cleanText(body.risk_grade),
      employee_count: cleanNullableNumber(body.employee_count),
      has_cipa: cleanBoolean(body.has_cipa),
      has_sesmt: cleanBoolean(body.has_sesmt),
      has_public_service: cleanBoolean(body.has_public_service),
      has_remote_work: cleanBoolean(body.has_remote_work),
      has_third_parties: cleanBoolean(body.has_third_parties),
      has_external_activities: cleanBoolean(body.has_external_activities),
    }
    const userClient = createNr1UserClientFromBearer(bearerToken)
    const result = await userClient.from("nr1_companies")
      .update(payload)
      .eq("tenant_id", scope.tenantId)
      .eq("id", companyId)
      .is("deleted_at", null)
      .select("*")
    if (result.error) {
      return json(500, { ok: false, error: "nr1_company_update_failed" })
    }
    const rows = (result.data || []) as Nr1CompanyRow[]
    if (rows.length === 0) return json(404, { ok: false, error: "company_not_found" })
    if (rows.length !== 1) return json(500, { ok: false, error: "invalid_update_result" })
    return json(200, { ok: true, tenantId: scope.tenantId, membershipRole: scope.role, item: rows[0] })
  } catch (error) {
    const response = nr1ErrorToResponsePayload(error)
    return json(response.status, response.body)
  }
}
