import { NextRequest, NextResponse } from "next/server"
import type { Json } from "@/lib/database.types"
import type {
  Nr1TriggerInvestigationAnswerInsert,
  Nr1TriggerInvestigationAnswerRow,
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

type SaveAnswerBody = {
  establishment_id?: string
  question_key?: string
  question_label?: string
  answer_value?: string | null
  answer_json?: Json
  answer_order?: number
  is_required?: boolean
}

function json(status: number, payload: Record<string, unknown>) {
  return NextResponse.json(payload, { status })
}

function cleanText(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  if (!trimmed || trimmed.length > maxLength) return null
  return trimmed
}

function getTenantId(req: NextRequest): string {
  return (
    (req.nextUrl.searchParams.get("tenantId") || "").trim() ||
    (req.headers.get("x-icanhelp-tenant") || "").trim()
  )
}

function getEstablishmentId(req: NextRequest): string | null {
  return cleanText(req.nextUrl.searchParams.get("establishmentId"), 36)
}

function isQuestionKey(value: string) {
  return /^[a-z0-9][a-z0-9_-]{0,119}$/i.test(value)
}

function isJson(value: unknown, depth = 0): value is Json {
  if (depth > 20) return false

  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean"
  ) {
    return true
  }

  if (typeof value === "number") {
    return Number.isFinite(value)
  }

  if (Array.isArray(value)) {
    return value.every((item) => isJson(item, depth + 1))
  }

  if (typeof value !== "object") {
    return false
  }

  return Object.values(value as Record<string, unknown>).every(
    (item) => item === undefined || isJson(item, depth + 1),
  )
}

async function requireInvestigationInScope(
  userClient: ReturnType<typeof createNr1UserClientFromBearer>,
  tenantId: string,
  establishmentId: string,
  investigationId: string,
) {
  const result = await userClient
    .from("nr1_trigger_investigations")
    .select("*")
    .eq("id", investigationId)
    .eq("tenant_id", tenantId)
    .eq("establishment_id", establishmentId)
    .is("deleted_at", null)

  if (result.error) {
    return {
      ok: false as const,
      status: 500,
      error: "nr1_trigger_investigation_lookup_failed",
      message: result.error.message,
    }
  }

  const rows = (result.data || []) as Nr1TriggerInvestigationRow[]

  if (rows.length === 0) {
    return {
      ok: false as const,
      status: 404,
      error: "nr1_trigger_investigation_not_found",
      message: "Trigger investigation not found in requested scope",
    }
  }

  if (rows.length > 1) {
    return {
      ok: false as const,
      status: 409,
      error: "nr1_trigger_investigation_duplicate",
      message: "Expected one trigger investigation",
    }
  }

  return {
    ok: true as const,
    row: rows[0],
  }
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const params = await context.params
    const investigationId = cleanText(params?.id, 36)
    const tenantId = getTenantId(req)
    const establishmentId = getEstablishmentId(req)

    if (!investigationId) {
      return json(400, { ok: false, error: "missing_investigation_id" })
    }

    if (!tenantId) {
      return json(400, { ok: false, error: "missing_tenant_id" })
    }

    if (!establishmentId) {
      return json(400, { ok: false, error: "missing_establishment_id" })
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

    const investigationCheck = await requireInvestigationInScope(
      userClient,
      scope.tenantId,
      establishmentId,
      investigationId,
    )

    if (!investigationCheck.ok) {
      return json(investigationCheck.status, {
        ok: false,
        error: investigationCheck.error,
        message: investigationCheck.message,
      })
    }

    const result = await userClient
      .from("nr1_trigger_investigation_answers")
      .select("*")
      .eq("tenant_id", scope.tenantId)
      .eq("trigger_investigation_id", investigationId)
      .is("deleted_at", null)
      .order("answer_order", { ascending: true })

    if (result.error) {
      return json(500, {
        ok: false,
        error: "nr1_trigger_investigation_answers_list_failed",
        message: result.error.message,
      })
    }

    return json(200, {
      ok: true,
      tenantId: scope.tenantId,
      establishmentId,
      investigationId,
      membershipRole: scope.role,
      investigationStatus: investigationCheck.row.investigation_status,
      triggerType: investigationCheck.row.trigger_type,
      items: (result.data || []) as Nr1TriggerInvestigationAnswerRow[],
    })
  } catch (error) {
    const response = nr1ErrorToResponsePayload(error)
    return json(response.status, response.body)
  }
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const params = await context.params
    const investigationId = cleanText(params?.id, 36)
    const tenantId = getTenantId(req)

    if (!investigationId) {
      return json(400, { ok: false, error: "missing_investigation_id" })
    }

    if (!tenantId) {
      return json(400, { ok: false, error: "missing_tenant_id" })
    }

    let body: SaveAnswerBody

    try {
      body = (await req.json()) as SaveAnswerBody
    } catch {
      return json(400, { ok: false, error: "invalid_json" })
    }

    const establishmentId = cleanText(body.establishment_id, 36)
    const questionKey = cleanText(body.question_key, 120)
    const questionLabel = cleanText(body.question_label, 500)

    if (!establishmentId) {
      return json(400, { ok: false, error: "missing_establishment_id" })
    }

    if (!questionKey || !isQuestionKey(questionKey)) {
      return json(400, { ok: false, error: "invalid_question_key" })
    }

    if (!questionLabel) {
      return json(400, { ok: false, error: "missing_question_label" })
    }

    const answerValue =
      body.answer_value === null
        ? null
        : cleanText(body.answer_value, 2000)

    if (body.answer_value !== undefined && body.answer_value !== null && !answerValue) {
      return json(400, { ok: false, error: "invalid_answer_value" })
    }

    const answerJson = body.answer_json ?? {}

    if (!isJson(answerJson)) {
      return json(400, { ok: false, error: "invalid_answer_json" })
    }

    const answerOrder =
      typeof body.answer_order === "number" &&
      Number.isInteger(body.answer_order) &&
      body.answer_order >= 0 &&
      body.answer_order <= 100
        ? body.answer_order
        : null

    if (answerOrder === null) {
      return json(400, { ok: false, error: "invalid_answer_order" })
    }

    const isRequired =
      typeof body.is_required === "boolean" ? body.is_required : false

    const scope = await resolveNr1Scope({
      req,
      tenantId,
      establishmentId,
    })

    if (!isTenantAdminRole(scope.role)) {
      return json(403, {
        ok: false,
        error: "nr1_trigger_investigation_answer_write_forbidden",
        message: "Only owner or admin can save trigger investigation answers",
      })
    }

    const bearerToken = extractBearerToken(req)

    if (!bearerToken) {
      return json(401, { ok: false, error: "missing_bearer" })
    }

    const userClient = createNr1UserClientFromBearer(bearerToken)

    const investigationCheck = await requireInvestigationInScope(
      userClient,
      scope.tenantId,
      establishmentId,
      investigationId,
    )

    if (!investigationCheck.ok) {
      return json(investigationCheck.status, {
        ok: false,
        error: investigationCheck.error,
        message: investigationCheck.message,
      })
    }

    if (
      investigationCheck.row.investigation_status === "archived" ||
      investigationCheck.row.investigation_status === "converted_to_risk"
    ) {
      return json(409, {
        ok: false,
        error: "nr1_trigger_investigation_not_editable",
        investigationStatus: investigationCheck.row.investigation_status,
      })
    }

    const existingResult = await userClient
      .from("nr1_trigger_investigation_answers")
      .select("*")
      .eq("tenant_id", scope.tenantId)
      .eq("trigger_investigation_id", investigationId)
      .eq("question_key", questionKey)
      .is("deleted_at", null)

    if (existingResult.error) {
      return json(500, {
        ok: false,
        error: "nr1_trigger_investigation_answer_lookup_failed",
        message: existingResult.error.message,
      })
    }

    const existingRows =
      (existingResult.data || []) as Nr1TriggerInvestigationAnswerRow[]

    if (existingRows.length > 1) {
      return json(409, {
        ok: false,
        error: "nr1_trigger_investigation_answer_duplicate",
      })
    }

    let saved: Nr1TriggerInvestigationAnswerRow
    let mode: "created" | "updated"

    if (existingRows.length === 0) {
      const payload: Nr1TriggerInvestigationAnswerInsert = {
        tenant_id: scope.tenantId,
        trigger_investigation_id: investigationId,
        question_key: questionKey,
        question_label: questionLabel,
        answer_value: answerValue,
        answer_json: answerJson,
        answer_order: answerOrder,
        is_required: isRequired,
        created_by: scope.user.id,
        updated_by: scope.user.id,
      }

      const insertResult = await userClient
        .from("nr1_trigger_investigation_answers")
        .insert(payload)
        .select("*")
        .single()

      if (insertResult.error) {
        return json(500, {
          ok: false,
          error: "nr1_trigger_investigation_answer_create_failed",
          message: insertResult.error.message,
        })
      }

      saved = insertResult.data as Nr1TriggerInvestigationAnswerRow
      mode = "created"
    } else {
      const updateResult = await userClient
        .from("nr1_trigger_investigation_answers")
        .update({
          question_label: questionLabel,
          answer_value: answerValue,
          answer_json: answerJson,
          answer_order: answerOrder,
          is_required: isRequired,
          updated_by: scope.user.id,
        })
        .eq("id", existingRows[0].id)
        .eq("tenant_id", scope.tenantId)
        .select("*")
        .single()

      if (updateResult.error) {
        return json(500, {
          ok: false,
          error: "nr1_trigger_investigation_answer_update_failed",
          message: updateResult.error.message,
        })
      }

      saved = updateResult.data as Nr1TriggerInvestigationAnswerRow
      mode = "updated"
    }

    if (
      investigationCheck.row.investigation_status === "in_investigation" ||
      investigationCheck.row.investigation_status === "saved_draft"
    ) {
      const investigationUpdate = await userClient
        .from("nr1_trigger_investigations")
        .update({
          investigation_status: "saved_draft",
          updated_by: scope.user.id,
        })
        .eq("id", investigationId)
        .eq("tenant_id", scope.tenantId)

      if (investigationUpdate.error) {
        return json(500, {
          ok: false,
          error: "nr1_trigger_investigation_draft_status_update_failed",
          message: investigationUpdate.error.message,
        })
      }
    }

    const resultingInvestigationStatus =
      investigationCheck.row.investigation_status === "in_investigation" ||
      investigationCheck.row.investigation_status === "saved_draft"
        ? "saved_draft"
        : investigationCheck.row.investigation_status

    const previousAnswer =
      existingRows.length === 1
        ? {
            question_key: existingRows[0].question_key,
            answer_value: existingRows[0].answer_value,
            answer_json: existingRows[0].answer_json,
            answer_order: existingRows[0].answer_order,
            is_required: existingRows[0].is_required,
          }
        : null

    const auditResult = await insertNr1AuditEvents(userClient, [
      {
        tenantId: scope.tenantId,
        establishmentId,
        entityType: "nr1_trigger_investigation_answer",
        entityId: saved.id,
        eventType: "trigger_question_answered",
        userId: scope.user.id,
        oldValueJson: previousAnswer,
        newValueJson: {
          question_key: saved.question_key,
          answer_value: saved.answer_value,
          answer_json: saved.answer_json,
          answer_order: saved.answer_order,
          is_required: saved.is_required,
          save_mode: mode,
        },
      },
      {
        tenantId: scope.tenantId,
        establishmentId,
        entityType: "nr1_trigger_investigation",
        entityId: investigationId,
        eventType: "trigger_investigation_saved",
        userId: scope.user.id,
        oldValueJson: {
          investigation_status: investigationCheck.row.investigation_status,
        },
        newValueJson: {
          investigation_status: resultingInvestigationStatus,
          answered_question_key: questionKey,
        },
      },
    ])

    if (!auditResult.ok) {
      return json(500, {
        ok: false,
        error: "nr1_trigger_investigation_answer_audit_failed",
        message: auditResult.error,
        answerSaved: true,
        answerId: saved.id,
      })
    }

    return json(mode === "created" ? 201 : 200, {
      ok: true,
      saved: mode,
      tenantId: scope.tenantId,
      establishmentId,
      investigationId,
      membershipRole: scope.role,
      investigationStatus: resultingInvestigationStatus,
      item: saved,
    })
  } catch (error) {
    const response = nr1ErrorToResponsePayload(error)
    return json(response.status, response.body)
  }
}

