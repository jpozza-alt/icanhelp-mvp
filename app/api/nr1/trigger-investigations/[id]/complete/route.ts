import { NextRequest, NextResponse } from "next/server"

import type {
  Nr1TriggerInvestigationAnswerRow,
  Nr1TriggerInvestigationRow,
  Nr1TriggerInvestigationUpdate,
} from "@/lib/nr1-db-types"
import {
  TRIGGER_INVESTIGATION_TYPES,
  type TriggerInvestigationType,
} from "@/lib/nr1-trigger-investigation-matrix"
import { evaluateTriggerInvestigation } from "@/lib/nr1-trigger-investigation-result-engine"
import { insertNr1AuditEvents, type Nr1AuditEventInput } from "@/lib/server/nr1-audit-events"
import {
  createNr1UserClientFromBearer,
  extractBearerToken,
  isTenantAdminRole,
  nr1ErrorToResponsePayload,
  resolveNr1Scope,
} from "@/lib/server/nr1-scope"

export const dynamic = "force-dynamic"

type CompleteInvestigationBody = {
  establishment_id?: string
}

function json(
  status: number,
  payload: Record<string, unknown>,
) {
  return NextResponse.json(payload, { status })
}

function cleanText(
  value: unknown,
  maxLength: number,
): string | null {
  if (typeof value !== "string") return null

  const trimmed = value.trim()

  if (!trimmed || trimmed.length > maxLength) {
    return null
  }

  return trimmed
}

function getTenantId(req: NextRequest): string {
  return (
    (req.nextUrl.searchParams.get("tenantId") || "").trim() ||
    (req.headers.get("x-icanhelp-tenant") || "").trim()
  )
}

function isTriggerType(
  value: string,
): value is TriggerInvestigationType {
  return (
    TRIGGER_INVESTIGATION_TYPES as readonly string[]
  ).includes(value)
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
      return json(400, {
        ok: false,
        error: "missing_investigation_id",
      })
    }

    if (!tenantId) {
      return json(400, {
        ok: false,
        error: "missing_tenant_id",
      })
    }

    let body: CompleteInvestigationBody

    try {
      body = (await req.json()) as CompleteInvestigationBody
    } catch {
      return json(400, {
        ok: false,
        error: "invalid_json",
      })
    }

    const establishmentId = cleanText(
      body.establishment_id,
      36,
    )

    if (!establishmentId) {
      return json(400, {
        ok: false,
        error: "missing_establishment_id",
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
        error:
          "nr1_trigger_investigation_complete_forbidden",
        message:
          "Only owner or admin can complete trigger investigations",
      })
    }

    const bearerToken = extractBearerToken(req)

    if (!bearerToken) {
      return json(401, {
        ok: false,
        error: "missing_bearer",
      })
    }

    const userClient =
      createNr1UserClientFromBearer(bearerToken)

    const investigationResult = await userClient
      .from("nr1_trigger_investigations")
      .select("*")
      .eq("id", investigationId)
      .eq("tenant_id", scope.tenantId)
      .eq("establishment_id", establishmentId)
      .is("deleted_at", null)

    if (investigationResult.error) {
      return json(500, {
        ok: false,
        error:
          "nr1_trigger_investigation_lookup_failed",
        message: investigationResult.error.message,
      })
    }

    const investigations =
      (investigationResult.data ||
        []) as Nr1TriggerInvestigationRow[]

    if (investigations.length === 0) {
      return json(404, {
        ok: false,
        error:
          "nr1_trigger_investigation_not_found",
      })
    }

    if (investigations.length > 1) {
      return json(409, {
        ok: false,
        error:
          "nr1_trigger_investigation_duplicate",
      })
    }

    const investigation = investigations[0]

    if (
      investigation.investigation_status ===
        "archived" ||
      investigation.investigation_status ===
        "converted_to_risk"
    ) {
      return json(409, {
        ok: false,
        error:
          "nr1_trigger_investigation_not_editable",
        investigationStatus:
          investigation.investigation_status,
      })
    }

    if (!isTriggerType(investigation.trigger_type)) {
      return json(409, {
        ok: false,
        error:
          "nr1_trigger_investigation_invalid_trigger_type",
      })
    }

    const answersResult = await userClient
      .from("nr1_trigger_investigation_answers")
      .select("*")
      .eq("tenant_id", scope.tenantId)
      .eq(
        "trigger_investigation_id",
        investigationId,
      )
      .is("deleted_at", null)
      .order("answer_order", { ascending: true })

    if (answersResult.error) {
      return json(500, {
        ok: false,
        error:
          "nr1_trigger_investigation_answers_list_failed",
        message: answersResult.error.message,
      })
    }

    const answerRows =
      (answersResult.data ||
        []) as Nr1TriggerInvestigationAnswerRow[]

    const answers: Record<string, string | null> = {}

    for (const answer of answerRows) {
      answers[answer.question_key] =
        answer.answer_value
    }

    const evaluation = evaluateTriggerInvestigation(
      investigation.trigger_type,
      answers,
    )

    if (!evaluation.complete) {
      return json(409, {
        ok: false,
        error:
          "nr1_trigger_investigation_incomplete",
        missingQuestionKeys:
          evaluation.missingQuestionKeys,
        invalidQuestionKeys:
          evaluation.invalidQuestionKeys,
      })
    }

    if (!evaluation.suggestedResult) {
      return json(409, {
        ok: false,
        error:
          "nr1_trigger_investigation_result_unavailable",
      })
    }

    const completedAt = new Date().toISOString()

    const updatePayload: Nr1TriggerInvestigationUpdate =
      {
        investigation_status: "completed",
        suggested_result:
          evaluation.suggestedResult,
        technical_validation_required:
          evaluation.technicalValidationRequired,
        critical_alert_required:
          evaluation.criticalAlertRequired,
        completed_at: completedAt,
        completed_by: scope.user.id,
        updated_by: scope.user.id,
      }

    const updateResult = await userClient
      .from("nr1_trigger_investigations")
      .update(updatePayload)
      .eq("id", investigationId)
      .eq("tenant_id", scope.tenantId)
      .eq("establishment_id", establishmentId)
      .select("*")
      .single()

    if (updateResult.error) {
      return json(500, {
        ok: false,
        error:
          "nr1_trigger_investigation_complete_failed",
        message: updateResult.error.message,
      })
    }

    const saved =
      updateResult.data as Nr1TriggerInvestigationRow

    const auditEvents: Nr1AuditEventInput[] = [
      {
        tenantId: scope.tenantId,
        establishmentId,
        entityType: "nr1_trigger_investigation",
        entityId: investigationId,
        eventType:
          "trigger_investigation_completed",
        userId: scope.user.id,
        oldValueJson: {
          investigation_status:
            investigation.investigation_status,
          suggested_result:
            investigation.suggested_result,
        },
        newValueJson: {
          investigation_status:
            "completed",
          suggested_result:
            evaluation.suggestedResult,
        },
      },
      {
        tenantId: scope.tenantId,
        establishmentId,
        entityType: "nr1_trigger_investigation",
        entityId: investigationId,
        eventType: "trigger_result_suggested",
        userId: scope.user.id,
        oldValueJson: {
          suggested_result:
            investigation.suggested_result,
        },
        newValueJson: {
          suggested_result:
            evaluation.suggestedResult,
          adverse_question_keys:
            evaluation.adverseQuestionKeys,
          adverse_roles:
            evaluation.adverseRoles,
        },
      },
    ]

    if (evaluation.technicalValidationRequired) {
      auditEvents.push({
        tenantId: scope.tenantId,
        establishmentId,
        entityType: "nr1_trigger_investigation",
        entityId: investigationId,
        eventType:
          "technical_validation_required",
        userId: scope.user.id,
        oldValueJson: {
          technical_validation_required:
            investigation.technical_validation_required,
        },
        newValueJson: {
          technical_validation_required: true,
          unknown_question_keys:
            evaluation.unknownQuestionKeys,
          validation_question_keys:
            evaluation.technicalValidationQuestionKeys,
        },
      })
    }

    if (evaluation.criticalAlertRequired) {
      auditEvents.push({
        tenantId: scope.tenantId,
        establishmentId,
        entityType: "nr1_trigger_investigation",
        entityId: investigationId,
        eventType: "critical_alert_generated",
        userId: scope.user.id,
        oldValueJson: {
          critical_alert_required:
            investigation.critical_alert_required,
        },
        newValueJson: {
          critical_alert_required: true,
          critical_question_keys:
            evaluation.criticalQuestionKeys,
        },
      })
    }

    const auditResult =
      await insertNr1AuditEvents(
        userClient,
        auditEvents,
      )

    if (!auditResult.ok) {
      return json(500, {
        ok: false,
        error:
          "nr1_trigger_investigation_complete_audit_failed",
        message: auditResult.error,
        investigationUpdated: true,
        investigationId,
      })
    }

    return json(200, {
      ok: true,
      tenantId: scope.tenantId,
      establishmentId,
      investigationId,
      membershipRole: scope.role,
      investigationStatus:
        saved.investigation_status,
      suggestedResult:
        saved.suggested_result,
      technicalValidationRequired:
        saved.technical_validation_required,
      criticalAlertRequired:
        saved.critical_alert_required,
      evaluation,
    })
  } catch (error) {
    const response =
      nr1ErrorToResponsePayload(error)

    return json(
      response.status,
      response.body,
    )
  }
}

