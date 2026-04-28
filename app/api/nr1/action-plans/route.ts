import { NextRequest, NextResponse } from "next/server"
import type { Database } from "@/lib/database.types"
import type { Nr1ActionPlanRow } from "@/lib/nr1-db-types"
import {
  createNr1UserClientFromBearer,
  extractBearerToken,
  isTenantAdminRole,
  nr1ErrorToResponsePayload,
  resolveNr1Scope,
  createNr1AdminClient,
} from "@/lib/server/nr1-scope"

export const dynamic = "force-dynamic"

type Nr1ActionPlanInsert = Database["public"]["Tables"]["nr1_action_plans"]["Insert"]
type Nr1AuditEventInsert = Database["public"]["Tables"]["nr1_audit_events"]["Insert"]

type CreateActionPlanBody = {
  establishment_id?: string
  risk_id?: string
  title?: string
  description?: string | null
  measure_type?: string | null
  priority?: string | null
  status?: string | null
  due_date?: string | null
  responsible_name?: string | null
  responsible_user_id?: string | null
  monitoring_method?: string | null
  evidence_method?: string | null
  completion_indicator?: string | null
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

function getOptionalRiskId(req: NextRequest): string | null {
  const value = (req.nextUrl.searchParams.get("riskId") || "").trim()
  return value || null
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

export async function GET(req: NextRequest) {
  try {
    const tenantId = getTenantId(req)
    const establishmentId = getRequiredEstablishmentId(req)
    const riskId = getOptionalRiskId(req)

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
    const includeDeleted = getIncludeDeleted(req)

    let query = userClient
      .from("nr1_action_plans")
      .select("*")
      .eq("tenant_id", scope.tenantId)
      .eq("establishment_id", establishmentId)
      .order("created_at", { ascending: false })

    if (!includeDeleted) {
      query = query.is("deleted_at", null)
    }

    if (riskId) {
      query = query.eq("risk_id", riskId)
    }

    const result = await query

    if (result.error) {
      return json(500, {
        ok: false,
        error: "nr1_action_plans_list_failed",
        message: result.error.message,
      })
    }

    const rows = (result.data || []) as Nr1ActionPlanRow[]

    return json(200, {
      ok: true,
      tenantId: scope.tenantId,
      establishmentId,
      riskId: riskId ?? null,
      membershipRole: scope.role,
      count: rows.length,
      items: rows.map((row) => ({
        id: row.id,
        tenant_id: row.tenant_id,
        establishment_id: row.establishment_id,
        risk_id: row.risk_id,
        title: row.title,
        description: row.description,
        measure_type: row.measure_type,
        priority: row.priority,
        status: row.status,
        due_date: row.due_date,
        responsible_name: row.responsible_name,
        responsible_user_id: row.responsible_user_id,
        monitoring_method: row.monitoring_method,
        evidence_method: row.evidence_method,
        completion_indicator: row.completion_indicator,
        completed_at: row.completed_at,
        completed_by: row.completed_by,
        notes: row.notes,
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

    let body: CreateActionPlanBody
    try {
      body = (await req.json()) as CreateActionPlanBody
    } catch {
      return json(400, {
        ok: false,
        error: "invalid_json",
        message: "Request body must be valid JSON",
      })
    }

    const establishmentId = cleanText(body.establishment_id)
    const riskId = cleanText(body.risk_id)
    const title = cleanText(body.title)

    if (!establishmentId) {
      return json(400, {
        ok: false,
        error: "missing_establishment_id",
        message: "establishment_id is required",
      })
    }

    if (!riskId) {
      return json(400, {
        ok: false,
        error: "missing_risk_id",
        message: "risk_id is required",
      })
    }

    if (!title || title.length < 3) {
      return json(400, {
        ok: false,
        error: "invalid_title",
        message: "title is required and must have at least 3 characters",
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
        error: "nr1_action_plans_create_forbidden",
        message: "Only owner or admin can create action plans",
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

    const payload: Nr1ActionPlanInsert = {
      tenant_id: scope.tenantId,
      establishment_id: establishmentId,
      risk_id: riskId,
      title,
      description: cleanText(body.description),
      measure_type: cleanText(body.measure_type),
      priority: cleanText(body.priority),
      status: cleanText(body.status) ?? "open",
      due_date: cleanText(body.due_date),
      responsible_name: cleanText(body.responsible_name),
      responsible_user_id: cleanText(body.responsible_user_id),
      monitoring_method: cleanText(body.monitoring_method),
      evidence_method: cleanText(body.evidence_method),
      completion_indicator: cleanText(body.completion_indicator),
      notes: cleanText(body.notes),
    }

    const insertResult = await userClient
      .from("nr1_action_plans")
      .insert(payload)
      .select("*")

    if (insertResult.error) {
      return json(500, {
        ok: false,
        error: "nr1_action_plan_create_failed",
        message: insertResult.error.message,
      })
    }

    const rows = (insertResult.data || []) as Nr1ActionPlanRow[]

    if (rows.length !== 1) {
      return json(500, {
        ok: false,
        error: "nr1_action_plan_create_invalid_result",
        message: "Expected 1 inserted row, got " + String(rows.length),
      })
    }

    const row = rows[0]
    const auditClient = createNr1AdminClient()

    const auditPayload: Nr1AuditEventInsert = {
      tenant_id: scope.tenantId,
      establishment_id: establishmentId,
      module_name: "nr1",
      screen_key: "nr1_action_plan",
      entity_type: "nr1_action_plan",
      entity_id: row.id,
      event_type: "nr1_action_plan_created",
      old_value_json: null,
      new_value_json: {
        action_plan_id: row.id,
        risk_id: row.risk_id,
        title: row.title,
        priority: row.priority ?? null,
        status: row.status ?? null,
      },
      persistence_type: "formal_version",
      reason: "nr1_action_plan_create",
      user_id: scope.membership.user_id,
    }

    const auditResult = await auditClient
      .from("nr1_audit_events")
      .insert(auditPayload)

    if (auditResult.error) {
      return json(500, {
        ok: false,
        error: "nr1_action_plan_audit_insert_failed",
        message: auditResult.error.message,
      })
    }

    return json(201, {
      ok: true,
      tenantId: scope.tenantId,
      establishmentId,
      membershipRole: scope.role,
      item: {
        id: row.id,
        tenant_id: row.tenant_id,
        establishment_id: row.establishment_id,
        risk_id: row.risk_id,
        title: row.title,
        description: row.description,
        measure_type: row.measure_type,
        priority: row.priority,
        status: row.status,
        due_date: row.due_date,
        responsible_name: row.responsible_name,
        responsible_user_id: row.responsible_user_id,
        monitoring_method: row.monitoring_method,
        evidence_method: row.evidence_method,
        completion_indicator: row.completion_indicator,
        completed_at: row.completed_at,
        completed_by: row.completed_by,
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
