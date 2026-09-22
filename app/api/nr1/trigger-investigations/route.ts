import { NextRequest, NextResponse } from "next/server"
import type {
  Nr1DiagnosisSessionRow,
  Nr1TriggerInvestigationInsert,
  Nr1TriggerInvestigationRow,
} from "@/lib/nr1-db-types"
import {
  createNr1UserClientFromBearer,
  extractBearerToken,
  isTenantAdminRole,
  nr1ErrorToResponsePayload,
  resolveNr1Scope,
} from "@/lib/server/nr1-scope"
import { insertNr1AuditEvents } from "@/lib/server/nr1-audit-events"

export const dynamic = "force-dynamic"

const TRIGGER_TYPES = [
  "deadline_pressure",
  "public_service",
  "remote_or_hybrid_work",
  "third_parties",
  "repetitive_work",
  "prolonged_sitting",
  "intermediate_leadership",
  "frequent_changes",
  "task_accumulation",
  "frequent_conflicts",
  "harassment_or_violence",
] as const

type TriggerType = (typeof TRIGGER_TYPES)[number]

type OpenTriggerInvestigationBody = {
  establishment_id?: string
  diagnosis_session_id?: string
  trigger_type?: string
  trigger_label?: string
}

function json(status: number, payload: Record<string, unknown>) {
  return NextResponse.json(payload, { status })
}

function cleanText(value: unknown): string | null {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function getTenantId(req: NextRequest): string {
  return (
    (req.nextUrl.searchParams.get("tenantId") || "").trim() ||
    (req.headers.get("x-icanhelp-tenant") || "").trim()
  )
}

function getRequiredEstablishmentId(req: NextRequest): string | null {
  return cleanText(req.nextUrl.searchParams.get("establishmentId"))
}

function getRequiredDiagnosisSessionId(req: NextRequest): string | null {
  return cleanText(req.nextUrl.searchParams.get("diagnosisSessionId"))
}

function isTriggerType(value: string): value is TriggerType {
  return (TRIGGER_TYPES as readonly string[]).includes(value)
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
      message: "Diagnosis session not found in requested tenant and establishment",
    }
  }

  if (rows.length > 1) {
    return {
      ok: false as const,
      status: 409,
      error: "nr1_diagnosis_session_duplicate",
      message: "Expected one diagnosis session",
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
      return json(400, { ok: false, error: "missing_tenant_id" })
    }

    if (!establishmentId) {
      return json(400, { ok: false, error: "missing_establishment_id" })
    }

    if (!diagnosisSessionId) {
      return json(400, { ok: false, error: "missing_diagnosis_session_id" })
    }

    const scope = await resolveNr1Scope({
      req,
      tenantId,
      establishmentId,
    })

    const bearerToken = extractBearerToken(req)

    if (!bearerToken) {
      return json(401, { ok: false, error: "missing_bearer" })
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
      .from("nr1_trigger_investigations")
      .select("*")
      .eq("tenant_id", scope.tenantId)
      .eq("establishment_id", establishmentId)
      .eq("diagnosis_session_id", diagnosisSessionId)
      .is("deleted_at", null)
      .order("created_at", { ascending: true })

    if (result.error) {
      return json(500, {
        ok: false,
        error: "nr1_trigger_investigations_list_failed",
        message: result.error.message,
      })
    }

    return json(200, {
      ok: true,
      tenantId: scope.tenantId,
      establishmentId,
      diagnosisSessionId,
      membershipRole: scope.role,
      items: (result.data || []) as Nr1TriggerInvestigationRow[],
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
      return json(400, { ok: false, error: "missing_tenant_id" })
    }

    let body: OpenTriggerInvestigationBody

    try {
      body = (await req.json()) as OpenTriggerInvestigationBody
    } catch {
      return json(400, { ok: false, error: "invalid_json" })
    }

    const establishmentId = cleanText(body.establishment_id)
    const diagnosisSessionId = cleanText(body.diagnosis_session_id)
    const triggerType = cleanText(body.trigger_type)
    const triggerLabel = cleanText(body.trigger_label)

    if (!establishmentId) {
      return json(400, { ok: false, error: "missing_establishment_id" })
    }

    if (!diagnosisSessionId) {
      return json(400, { ok: false, error: "missing_diagnosis_session_id" })
    }

    if (!triggerType || !isTriggerType(triggerType)) {
      return json(400, {
        ok: false,
        error: "invalid_trigger_type",
        allowed: TRIGGER_TYPES,
      })
    }

    if (!triggerLabel) {
      return json(400, { ok: false, error: "missing_trigger_label" })
    }

    const scope = await resolveNr1Scope({
      req,
      tenantId,
      establishmentId,
    })

    if (!isTenantAdminRole(scope.role)) {
      return json(403, {
        ok: false,
        error: "nr1_trigger_investigation_open_forbidden",
        message: "Only owner or admin can open trigger investigations",
      })
    }

    const bearerToken = extractBearerToken(req)

    if (!bearerToken) {
      return json(401, { ok: false, error: "missing_bearer" })
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
      .from("nr1_trigger_investigations")
      .select("*")
      .eq("tenant_id", scope.tenantId)
      .eq("diagnosis_session_id", diagnosisSessionId)
      .eq("trigger_type", triggerType)
      .is("deleted_at", null)

    if (existingResult.error) {
      return json(500, {
        ok: false,
        error: "nr1_trigger_investigation_lookup_failed",
        message: existingResult.error.message,
      })
    }

    const existingRows =
      (existingResult.data || []) as Nr1TriggerInvestigationRow[]

    if (existingRows.length > 1) {
      return json(409, {
        ok: false,
        error: "nr1_trigger_investigation_duplicate",
      })
    }

    if (existingRows.length === 1) {
      return json(200, {
        ok: true,
        opened: "existing",
        tenantId: scope.tenantId,
        establishmentId,
        diagnosisSessionId,
        membershipRole: scope.role,
        item: existingRows[0],
      })
    }

    const payload: Nr1TriggerInvestigationInsert = {
      tenant_id: scope.tenantId,
      establishment_id: establishmentId,
      department_id: sessionCheck.row.department_id,
      activity_id: sessionCheck.row.activity_id,
      diagnosis_session_id: diagnosisSessionId,
      trigger_type: triggerType,
      trigger_label: triggerLabel,
      initial_answer: "yes",
      official_message_shown: true,
      investigation_status: "in_investigation",
      created_by: scope.user.id,
      updated_by: scope.user.id,
    }

    const insertResult = await userClient
      .from("nr1_trigger_investigations")
      .insert(payload)
      .select("*")
      .single()

    if (insertResult.error) {
      return json(500, {
        ok: false,
        error: "nr1_trigger_investigation_create_failed",
        message: insertResult.error.message,
      })
    }

    const createdInvestigation =
      insertResult.data as Nr1TriggerInvestigationRow

    const auditResult = await insertNr1AuditEvents(userClient, [
      {
        tenantId: scope.tenantId,
        establishmentId,
        entityType: "nr1_trigger_investigation",
        entityId: createdInvestigation.id,
        eventType: "trigger_marked_yes",
        userId: scope.user.id,
        newValueJson: {
          trigger_type: triggerType,
          trigger_label: triggerLabel,
          initial_answer: "yes",
        },
      },
      {
        tenantId: scope.tenantId,
        establishmentId,
        entityType: "nr1_trigger_investigation",
        entityId: createdInvestigation.id,
        eventType: "official_message_shown",
        userId: scope.user.id,
        newValueJson: {
          official_message_shown: true,
        },
      },
      {
        tenantId: scope.tenantId,
        establishmentId,
        entityType: "nr1_trigger_investigation",
        entityId: createdInvestigation.id,
        eventType: "trigger_investigation_started",
        userId: scope.user.id,
        newValueJson: {
          investigation_status: "in_investigation",
          diagnosis_session_id: diagnosisSessionId,
        },
      },
    ])

    if (!auditResult.ok) {
      return json(500, {
        ok: false,
        error: "nr1_trigger_investigation_audit_failed",
        message: auditResult.error,
        investigationCreated: true,
        investigationId: createdInvestigation.id,
      })
    }

    return json(201, {
      ok: true,
      opened: "created",
      tenantId: scope.tenantId,
      establishmentId,
      diagnosisSessionId,
      membershipRole: scope.role,
      officialMessage:
        "Este ponto nao e automaticamente um risco. Vamos entender melhor a situacao antes de classificar.",
      item: createdInvestigation,
    })
  } catch (error) {
    const response = nr1ErrorToResponsePayload(error)
    return json(response.status, response.body)
  }
}

