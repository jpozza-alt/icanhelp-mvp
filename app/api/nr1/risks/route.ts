import { NextRequest, NextResponse } from "next/server"
import type { Database } from "@/lib/database.types"
import type { Nr1RiskRow } from "@/lib/nr1-db-types"
import {
  createNr1UserClientFromBearer,
  extractBearerToken,
  isTenantAdminRole,
  resolveNr1Scope,
  createNr1AdminClient,
} from "@/lib/server/nr1-scope"

export const dynamic = "force-dynamic"

type Nr1RiskInsert = Database["public"]["Tables"]["nr1_risks"]["Insert"]
type Nr1AuditEventInsert = Database["public"]["Tables"]["nr1_audit_events"]["Insert"]

type CreateRiskBody = {
  establishment_id?: string
  department_id?: string
  activity_id?: string
  diagnosis_session_id?: string | null
  title?: string
  risk_category?: string
  hazard_description?: string
  source_circumstance?: string | null
  exposed_group?: string | null
  possible_harms?: string | null
  existing_controls?: string | null
  exposure_characterization?: string | null
  severity_level?: string | null
  probability_level?: string | null
  risk_level?: string | null
  classification?: string | null
  recommended_measure?: string | null
  suggested_responsible?: string | null
  suggested_deadline?: string | null
  status?: string | null
}

const ALLOWED_RISK_CATEGORIES = new Set([
  "physical",
  "chemical",
  "biological",
  "accident",
  "ergonomics",
  "psychosocial",
  "mixed",
])

const ALLOWED_STATUSES = new Set([
  "identified",
  "under_analysis",
  "classified",
  "action_defined",
  "controlled",
  "requires_review",
])

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

function cleanText(value: unknown): string | null {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
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

    const result = await userClient
      .from("nr1_risks")
      .select("*")
      .eq("tenant_id", scope.tenantId)
      .eq("establishment_id", establishmentId)
      .order("created_at", { ascending: false })

    if (result.error) {
      return json(500, {
        ok: false,
        error: "nr1_risks_list_failed",
        message: result.error.message,
      })
    }

    const rows = (result.data || []) as Nr1RiskRow[]

    return json(200, {
      ok: true,
      tenantId: scope.tenantId,
      establishmentId,
      membershipRole: scope.role,
      count: rows.length,
      items: rows,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error"
    return json(500, {
      ok: false,
      error: "nr1_risks_list_unhandled",
      message,
    })
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

    const body = (await req.json().catch(() => null)) as CreateRiskBody | null
    if (!body) {
      return json(400, {
        ok: false,
        error: "invalid_json_body",
        message: "Invalid JSON body",
      })
    }

    const establishmentId = cleanText(body.establishment_id) || getRequiredEstablishmentId(req)
    const departmentId = cleanText(body.department_id)
    const activityId = cleanText(body.activity_id)
    const title = cleanText(body.title)
    const riskCategory = cleanText(body.risk_category)
    const hazardDescription = cleanText(body.hazard_description)
    const status = cleanText(body.status) || "identified"

    if (!establishmentId) {
      return json(400, {
        ok: false,
        error: "missing_establishment_id",
        message: "Provide establishment_id in body or establishmentId in querystring",
      })
    }

    if (!departmentId) {
      return json(400, {
        ok: false,
        error: "missing_department_id",
        message: "Provide department_id in request body",
      })
    }

    if (!activityId) {
      return json(400, {
        ok: false,
        error: "missing_activity_id",
        message: "Provide activity_id in request body",
      })
    }

    if (!title) {
      return json(400, {
        ok: false,
        error: "missing_title",
        message: "Provide title in request body",
      })
    }

    if (!riskCategory) {
      return json(400, {
        ok: false,
        error: "missing_risk_category",
        message: "Provide risk_category in request body",
      })
    }

    if (!ALLOWED_RISK_CATEGORIES.has(riskCategory)) {
      return json(400, {
        ok: false,
        error: "invalid_risk_category",
        message: "Allowed risk_category values: physical, chemical, biological, accident, ergonomics, psychosocial, mixed",
      })
    }

    if (!hazardDescription) {
      return json(400, {
        ok: false,
        error: "missing_hazard_description",
        message: "Provide hazard_description in request body",
      })
    }

    if (!ALLOWED_STATUSES.has(status)) {
      return json(400, {
        ok: false,
        error: "invalid_status",
        message: "Allowed status values: identified, under_analysis, classified, action_defined, controlled, requires_review",
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
        error: "insufficient_role",
        message: "Only owner/admin can create nr1_risks",
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

    const payload: Nr1RiskInsert = {
      tenant_id: scope.tenantId,
      establishment_id: establishmentId,
      department_id: departmentId,
      activity_id: activityId,
      diagnosis_session_id: cleanText(body.diagnosis_session_id),
      title,
      risk_category: riskCategory,
      hazard_description: hazardDescription,
      source_circumstance: cleanText(body.source_circumstance),
      exposed_group: cleanText(body.exposed_group),
      possible_harms: cleanText(body.possible_harms),
      existing_controls: cleanText(body.existing_controls),
      exposure_characterization: cleanText(body.exposure_characterization),
      severity_level: cleanText(body.severity_level),
      probability_level: cleanText(body.probability_level),
      risk_level: cleanText(body.risk_level),
      classification: cleanText(body.classification),
      recommended_measure: cleanText(body.recommended_measure),
      suggested_responsible: cleanText(body.suggested_responsible),
      suggested_deadline: cleanText(body.suggested_deadline),
      status,
    }

    const result = await userClient
      .from("nr1_risks")
      .insert(payload)
      .select("*")
      .single()

    if (result.error) {
      return json(500, {
        ok: false,
        error: "nr1_risks_create_failed",
        message: result.error.message,
      })
    }

    const row = result.data as Nr1RiskRow


    const auditEntityId = row.id || null

    if (!auditEntityId) {
      return json(500, {
        ok: false,
        error: "nr1_risk_audit_missing_entity",
        message: "Created risk id was not returned for audit event",
      })
    }

    const auditClient = createNr1AdminClient()

    const auditPayload: Nr1AuditEventInsert = {
      tenant_id: scope.tenantId,
      establishment_id: establishmentId,
      module_name: "nr1",
      screen_key: "nr1_risk_inventory",
      entity_type: "nr1_risk",
      entity_id: auditEntityId,
      event_type: "nr1_risk_created",
      old_value_json: null,
      new_value_json: {
        risk_id: auditEntityId,
        risk_category: payload.risk_category ?? null,
        risk_level: payload.risk_level ?? null,
        status: payload.status ?? null,
      },
      persistence_type: "formal_version",
      reason: "nr1_risk_inventory_create",
      user_id: scope.membership.user_id,
    }

    const auditResult = await auditClient
      .from("nr1_audit_events")
      .insert(auditPayload)

    if (auditResult.error) {
      return json(500, {
        ok: false,
        error: "nr1_risk_audit_insert_failed",
        message: auditResult.error.message,
      })
    }
    return json(201, {
      ok: true,
      tenantId: scope.tenantId,
      establishmentId,
      membershipRole: scope.role,
      item: row,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error"
    return json(500, {
      ok: false,
      error: "nr1_risks_create_unhandled",
      message,
    })
  }
}

