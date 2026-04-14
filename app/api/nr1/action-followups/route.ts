import { NextRequest, NextResponse } from "next/server"
import type { Database } from "@/lib/database.types"
import {
  createNr1UserClientFromBearer,
  extractBearerToken,
  isTenantAdminRole,
  nr1ErrorToResponsePayload,
  resolveNr1Scope,
} from "@/lib/server/nr1-scope"

export const dynamic = "force-dynamic"

type Nr1ActionPlanRow = Database["public"]["Tables"]["nr1_action_plans"]["Row"]
type Nr1ActionFollowupRow = Database["public"]["Tables"]["nr1_action_followups"]["Row"]
type Nr1ActionFollowupInsert = Database["public"]["Tables"]["nr1_action_followups"]["Insert"]

type CreateActionFollowupBody = {
  establishment_id?: string
  action_plan_id?: string
  followup_date?: string
  corrective_adjustment_needed?: boolean
  execution_check?: string | null
  inspection_result?: string | null
  environmental_monitoring_result?: string | null
  effectiveness_result?: string | null
  continuity_check?: string | null
  worker_participation_note?: string | null
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

function getRequiredActionPlanId(req: NextRequest): string | null {
  const value = (req.nextUrl.searchParams.get("actionPlanId") || "").trim()
  return value || null
}

function cleanText(value: unknown): string | null {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function cleanBoolean(value: unknown, fallback = false): boolean {
  return typeof value === "boolean" ? value : fallback
}

async function requireActionPlanInScope(
  userClient: ReturnType<typeof createNr1UserClientFromBearer>,
  tenantId: string,
  establishmentId: string,
  actionPlanId: string,
) {
  const result = await userClient
    .from("nr1_action_plans")
    .select("*")
    .eq("id", actionPlanId)
    .eq("tenant_id", tenantId)
    .eq("establishment_id", establishmentId)
    .is("deleted_at", null)

  if (result.error) {
    return {
      ok: false as const,
      status: 500,
      error: "nr1_action_plan_lookup_failed",
      message: result.error.message,
    }
  }

  const rows = (result.data || []) as Nr1ActionPlanRow[]

  if (rows.length === 0) {
    return {
      ok: false as const,
      status: 404,
      error: "nr1_action_plan_not_found",
      message: "No nr1_action_plans row found for tenant_id + establishment_id + action_plan_id",
    }
  }

  if (rows.length > 1) {
    return {
      ok: false as const,
      status: 409,
      error: "nr1_action_plan_duplicate",
      message: "Expected 1 action plan row, got " + String(rows.length),
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
    const actionPlanId = getRequiredActionPlanId(req)

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

    if (!actionPlanId) {
      return json(400, {
        ok: false,
        error: "missing_action_plan_id",
        message: "Provide actionPlanId in querystring",
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

    const actionPlanCheck = await requireActionPlanInScope(
      userClient,
      scope.tenantId,
      establishmentId,
      actionPlanId,
    )

    if (!actionPlanCheck.ok) {
      return json(actionPlanCheck.status, {
        ok: false,
        error: actionPlanCheck.error,
        message: actionPlanCheck.message,
      })
    }

    const result = await userClient
      .from("nr1_action_followups")
      .select("*")
      .eq("tenant_id", scope.tenantId)
      .eq("action_plan_id", actionPlanId)
      .order("followup_date", { ascending: false })

    if (result.error) {
      return json(500, {
        ok: false,
        error: "nr1_action_followups_list_failed",
        message: result.error.message,
      })
    }

    const rows = (result.data || []) as Nr1ActionFollowupRow[]

    return json(200, {
      ok: true,
      tenantId: scope.tenantId,
      establishmentId,
      actionPlanId,
      membershipRole: scope.role,
      actionPlan: {
        id: actionPlanCheck.row.id,
        risk_id: actionPlanCheck.row.risk_id,
        title: actionPlanCheck.row.title,
        status: actionPlanCheck.row.status,
        priority: actionPlanCheck.row.priority,
        due_date: actionPlanCheck.row.due_date,
      },
      count: rows.length,
      items: rows.map((row) => ({
        id: row.id,
        tenant_id: row.tenant_id,
        action_plan_id: row.action_plan_id,
        followup_date: row.followup_date,
        corrective_adjustment_needed: row.corrective_adjustment_needed,
        execution_check: row.execution_check,
        inspection_result: row.inspection_result,
        environmental_monitoring_result: row.environmental_monitoring_result,
        effectiveness_result: row.effectiveness_result,
        continuity_check: row.continuity_check,
        worker_participation_note: row.worker_participation_note,
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

    let body: CreateActionFollowupBody
    try {
      body = (await req.json()) as CreateActionFollowupBody
    } catch {
      return json(400, {
        ok: false,
        error: "invalid_json",
        message: "Request body must be valid JSON",
      })
    }

    const establishmentId = cleanText(body.establishment_id)
    const actionPlanId = cleanText(body.action_plan_id)
    const followupDate = cleanText(body.followup_date)

    if (!establishmentId) {
      return json(400, {
        ok: false,
        error: "missing_establishment_id",
        message: "establishment_id is required",
      })
    }

    if (!actionPlanId) {
      return json(400, {
        ok: false,
        error: "missing_action_plan_id",
        message: "action_plan_id is required",
      })
    }

    if (!followupDate) {
      return json(400, {
        ok: false,
        error: "missing_followup_date",
        message: "followup_date is required",
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
        error: "nr1_action_followups_create_forbidden",
        message: "Only owner or admin can create action followups",
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

    const actionPlanCheck = await requireActionPlanInScope(
      userClient,
      scope.tenantId,
      establishmentId,
      actionPlanId,
    )

    if (!actionPlanCheck.ok) {
      return json(actionPlanCheck.status, {
        ok: false,
        error: actionPlanCheck.error,
        message: actionPlanCheck.message,
      })
    }

    const payload: Nr1ActionFollowupInsert = {
      tenant_id: scope.tenantId,
      action_plan_id: actionPlanId,
      followup_date: followupDate,
      corrective_adjustment_needed: cleanBoolean(body.corrective_adjustment_needed, false),
      execution_check: cleanText(body.execution_check),
      inspection_result: cleanText(body.inspection_result),
      environmental_monitoring_result: cleanText(body.environmental_monitoring_result),
      effectiveness_result: cleanText(body.effectiveness_result),
      continuity_check: cleanText(body.continuity_check),
      worker_participation_note: cleanText(body.worker_participation_note),
      notes: cleanText(body.notes),
    }

    const insertResult = await userClient
      .from("nr1_action_followups")
      .insert(payload)
      .select("*")

    if (insertResult.error) {
      return json(500, {
        ok: false,
        error: "nr1_action_followup_create_failed",
        message: insertResult.error.message,
      })
    }

    const rows = (insertResult.data || []) as Nr1ActionFollowupRow[]

    if (rows.length !== 1) {
      return json(500, {
        ok: false,
        error: "nr1_action_followup_create_invalid_result",
        message: "Expected 1 inserted row, got " + String(rows.length),
      })
    }

    const row = rows[0]

    return json(201, {
      ok: true,
      tenantId: scope.tenantId,
      establishmentId,
      actionPlanId,
      membershipRole: scope.role,
      actionPlan: {
        id: actionPlanCheck.row.id,
        risk_id: actionPlanCheck.row.risk_id,
        title: actionPlanCheck.row.title,
        status: actionPlanCheck.row.status,
        priority: actionPlanCheck.row.priority,
        due_date: actionPlanCheck.row.due_date,
      },
      item: {
        id: row.id,
        tenant_id: row.tenant_id,
        action_plan_id: row.action_plan_id,
        followup_date: row.followup_date,
        corrective_adjustment_needed: row.corrective_adjustment_needed,
        execution_check: row.execution_check,
        inspection_result: row.inspection_result,
        environmental_monitoring_result: row.environmental_monitoring_result,
        effectiveness_result: row.effectiveness_result,
        continuity_check: row.continuity_check,
        worker_participation_note: row.worker_participation_note,
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