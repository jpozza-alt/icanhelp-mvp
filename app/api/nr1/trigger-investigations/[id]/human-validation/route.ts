import { NextRequest, NextResponse } from "next/server"

import type { Database } from "@/lib/database.types"

import type {
  Nr1TriggerInvestigationAnswerRow,
  Nr1TriggerInvestigationRow,
} from "@/lib/nr1-db-types"
import type {
  TriggerInvestigationSuggestedResult,
} from "@/lib/nr1-trigger-investigation-result-engine"
import {
  buildHumanValidationRecord,
} from "@/lib/nr1-trigger-investigation-validation-record"
import type {
  TriggerInvestigationValidationDecision,
} from "@/lib/nr1-trigger-investigation-validation"
import {
  createNr1UserClientFromBearer,
  extractBearerToken,
  isTenantAdminRole,
  nr1ErrorToResponsePayload,
  resolveNr1Scope,
} from "@/lib/server/nr1-scope"

export const dynamic = "force-dynamic"

type ValidationInsert =
  Database["public"]["Tables"]["nr1_trigger_investigation_validations"]["Insert"]

type HumanValidationBody = {
  establishment_id?: string
  decision?: string
  adjusted_result?: string | null
  notes?: string | null
}

const VALIDATION_DECISIONS = new Set<
  TriggerInvestigationValidationDecision
>([
  "confirm_result",
  "adjust_result",
  "reject_result",
  "request_more_information",
])

const SUGGESTED_RESULTS = new Set<
  TriggerInvestigationSuggestedResult
>([
  "no_relevant_indication",
  "attention_point",
  "possible_risk_factor",
  "suggested_risk",
])

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

function isValidationDecision(
  value: string,
): value is TriggerInvestigationValidationDecision {
  return VALIDATION_DECISIONS.has(
    value as TriggerInvestigationValidationDecision,
  )
}

function isSuggestedResult(
  value: string,
): value is TriggerInvestigationSuggestedResult {
  return SUGGESTED_RESULTS.has(
    value as TriggerInvestigationSuggestedResult,
  )
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const params = await context.params

    const investigationId =
      cleanText(params?.id, 36)

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

    let body: HumanValidationBody

    try {
      body = (await req.json()) as HumanValidationBody
    } catch {
      return json(400, {
        ok: false,
        error: "invalid_json",
      })
    }

    const establishmentId =
      cleanText(body.establishment_id, 36)

    if (!establishmentId) {
      return json(400, {
        ok: false,
        error: "missing_establishment_id",
      })
    }

    const decision =
      cleanText(body.decision, 64)

    if (
      !decision ||
      !isValidationDecision(decision)
    ) {
      return json(400, {
        ok: false,
        error:
          "invalid_human_validation_decision",
      })
    }

    let adjustedResult:
      TriggerInvestigationSuggestedResult | null = null

    if (body.adjusted_result != null) {
      const adjustedResultCandidate =
        cleanText(body.adjusted_result, 64)

      if (
        !adjustedResultCandidate ||
        !isSuggestedResult(
          adjustedResultCandidate,
        )
      ) {
        return json(400, {
          ok: false,
          error:
            "invalid_adjusted_result",
        })
      }

      adjustedResult =
        adjustedResultCandidate
    }

    const notes =
      body.notes == null
        ? null
        : cleanText(body.notes, 4000)

    const scope = await resolveNr1Scope({
      req,
      tenantId,
      establishmentId,
    })

    if (!isTenantAdminRole(scope.role)) {
      return json(403, {
        ok: false,
        error:
          "nr1_trigger_human_validation_forbidden",
        message:
          "Only owner or admin can validate trigger investigation results",
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
      investigation.investigation_status !==
      "completed"
    ) {
      return json(409, {
        ok: false,
        error:
          "nr1_trigger_investigation_not_ready_for_review",
        investigationStatus:
          investigation.investigation_status,
      })
    }

    const suggestedResult =
      investigation.suggested_result

    if (
      !suggestedResult ||
      !isSuggestedResult(suggestedResult)
    ) {
      return json(409, {
        ok: false,
        error:
          "nr1_trigger_investigation_result_unavailable",
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

    let validationBuild

    try {
      validationBuild =
        buildHumanValidationRecord({
          tenantId: scope.tenantId,
          establishmentId,
          investigationId,
          userId: scope.user.id,
          decision,
          suggestedResult,
          adjustedResult,
          notes,
          sourceSnapshot: {
            investigation_id:
              investigationId,
            trigger_type:
              investigation.trigger_type,
            suggested_result:
              suggestedResult,
            technical_validation_required:
              investigation.technical_validation_required,
            critical_alert_required:
              investigation.critical_alert_required,
            completed_at:
              investigation.completed_at,
            answers,
          },
        })
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "invalid_validation"

      return json(400, {
        ok: false,
        error: message,
      })
    }

    const validationRecord =
      validationBuild.record

    const reopenInvestigation =
      validationBuild.reopenInvestigation

    const validationResult = await userClient
      .from("nr1_trigger_investigation_validations")
      .insert(validationRecord as ValidationInsert)
      .select("*")
      .single()

    if (validationResult.error) {
      return json(500, {
        ok: false,
        error: "nr1_trigger_human_validation_create_failed",
        message: validationResult.error.message,
      })
    }

    const savedValidation = validationResult.data

    let nextInvestigationStatus =
      investigation.investigation_status

    if (reopenInvestigation) {
      const reopenResult = await userClient
        .from("nr1_trigger_investigations")
        .update({
          investigation_status: "in_investigation",
          completed_at: null,
          completed_by: null,
          updated_by: scope.user.id,
        })
        .eq("id", investigationId)
        .eq("tenant_id", scope.tenantId)
        .eq("establishment_id", establishmentId)
        .select("investigation_status")
        .single()

      if (reopenResult.error) {
        return json(500, {
          ok: false,
          error:
            "nr1_trigger_human_validation_reopen_failed",
          message: reopenResult.error.message,
          validationCreated: true,
          validationId: savedValidation.id,
        })
      }

      nextInvestigationStatus =
        reopenResult.data.investigation_status
    }

    return json(201, {
      ok: true,
      tenantId: scope.tenantId,
      establishmentId,
      investigationId,
      validationId: savedValidation.id,
      validationType: savedValidation.validation_type,
      validationStatus:
        savedValidation.validation_status,
      decisionType: savedValidation.decision_type,
      validatedResult:
        savedValidation.validated_result,
      technicalValidationRequired:
        investigation.technical_validation_required,
      criticalAlertRequired:
        investigation.critical_alert_required,
      reopenInvestigation,
      nextInvestigationStatus,
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



