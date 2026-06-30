import { NextRequest, NextResponse } from "next/server"
import type { Database, Json } from "@/lib/database.types"
import type {
  Nr1DiagnosisReviewRow,
  Nr1DiagnosisSessionRow,
} from "@/lib/nr1-db-types"
import {
  createNr1UserClientFromBearer,
  createNr1AdminClient,
  extractBearerToken,
  isTenantAdminRole,
  nr1ErrorToResponsePayload,
  resolveNr1Scope,
} from "@/lib/server/nr1-scope"

export const dynamic = "force-dynamic"

type Nr1RiskInsert = Database["public"]["Tables"]["nr1_risks"]["Insert"]
type Nr1AuditEventInsert = Database["public"]["Tables"]["nr1_audit_events"]["Insert"]

type UpsertDiagnosisReviewBody = {
  establishment_id?: string
  diagnosis_session_id?: string
  confirmed_exposed_group_json?: Json
  confirmed_hazards_json?: Json
  preliminary_priority?: string | null
  reviewer_comment?: string | null
  reviewed_at?: string | null
  generate_risk?: boolean
  generated_risk_title?: string | null
  generated_risk_category?: string | null
  generated_risk_hazard_description?: string | null
  generated_risk_source_circumstance?: string | null
  generated_risk_recommended_measure?: string | null
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

function getRequiredDiagnosisSessionId(req: NextRequest): string | null {
  const value = (req.nextUrl.searchParams.get("diagnosisSessionId") || "").trim()
  return value || null
}

function cleanText(value: unknown): string | null {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function normalizeJson(value: unknown, fallback: Json): Json {
  if (value === undefined) return fallback
  return value as Json
}

function resolveReviewedAt(value: unknown): string | null {
  const cleaned = cleanText(value)
  return cleaned
}


type GeneratedRiskResult = {
  generated: boolean
  riskId: string | null
  reason: string
}

function normalizeGeneratedRiskCategory(value: unknown): string {
  const category = cleanText(value)

  if (
    category === "physical" ||
    category === "chemical" ||
    category === "biological" ||
    category === "accident" ||
    category === "ergonomics" ||
    category === "psychosocial" ||
    category === "mixed"
  ) {
    return category
  }

  return "psychosocial"
}

function normalizeGeneratedRiskLevel(value: unknown): string {
  const level = cleanText(value)

  if (level === "low" || level === "medium" || level === "high" || level === "critical") {
    return level
  }

  return "medium"
}

function textFromJsonValue(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim()
    return trimmed.length > 0 ? trimmed : null
  }

  if (Array.isArray(value)) {
    const parts = value
      .map((item) => textFromJsonValue(item))
      .filter((item): item is string => Boolean(item))

    return parts.length > 0 ? parts.join("; ") : null
  }

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>
    const preferred =
      textFromJsonValue(record.title) ||
      textFromJsonValue(record.name) ||
      textFromJsonValue(record.description) ||
      textFromJsonValue(record.label) ||
      textFromJsonValue(record.value)

    if (preferred) {
      return preferred
    }

    const parts = Object.values(record)
      .map((item) => textFromJsonValue(item))
      .filter((item): item is string => Boolean(item))

    return parts.length > 0 ? parts.join("; ") : null
  }

  return null
}

function limitText(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value
  return value.slice(0, maxLength)
}

async function maybeGenerateRiskFromReview(params: {
  body: UpsertDiagnosisReviewBody
  scope: any
  userClient: ReturnType<typeof createNr1UserClientFromBearer>
  reviewRow: Nr1DiagnosisReviewRow
  sessionRow: Record<string, unknown>
  establishmentId: string
  diagnosisSessionId: string
}): Promise<GeneratedRiskResult | null> {
  if (params.body.generate_risk !== true) {
    return null
  }

  const departmentId = cleanText(params.sessionRow.department_id)
  const activityId = cleanText(params.sessionRow.activity_id)

  if (!departmentId || !activityId) {
    return {
      generated: false,
      riskId: null,
      reason: "missing_department_or_activity",
    }
  }

  const existingRiskResult = await params.userClient
    .from("nr1_risks")
    .select("id")
    .eq("tenant_id", params.scope.tenantId)
    .eq("establishment_id", params.establishmentId)
    .eq("diagnosis_session_id", params.diagnosisSessionId)
    .limit(1)

  if (existingRiskResult.error) {
    throw new Error("nr1_generated_risk_existing_lookup_failed: " + existingRiskResult.error.message)
  }

  const existingRows = (existingRiskResult.data || []) as Array<{ id: string }>

  if (existingRows.length > 0) {
    return {
      generated: false,
      riskId: existingRows[0].id,
      reason: "already_exists",
    }
  }

  const psychosocialResult = await params.userClient
    .from("nr1_diagnosis_psychosocial")
    .select("*")
    .eq("tenant_id", params.scope.tenantId)
    .eq("diagnosis_session_id", params.diagnosisSessionId)
    .limit(1)

  if (psychosocialResult.error) {
    throw new Error("nr1_generated_risk_psychosocial_lookup_failed: " + psychosocialResult.error.message)
  }

  const factorResult = await params.userClient
    .from("nr1_diagnosis_psychosocial_factors")
    .select("factor_key,factor_label,status,confidence_level,sources,justification,evidence_summary,investigation_pending,pending_action")
    .eq("tenant_id", params.scope.tenantId)
    .eq("diagnosis_session_id", params.diagnosisSessionId)
    .order("factor_key", { ascending: true })

  if (factorResult.error) {
    throw new Error("nr1_generated_risk_psychosocial_factors_lookup_failed: " + factorResult.error.message)
  }

  const psychosocialRows = (psychosocialResult.data || []) as Array<Record<string, unknown>>
  const psychosocialRow = psychosocialRows[0] || null
  const factorRows = (factorResult.data || []) as Array<Record<string, unknown>>

  const relevantFactors = factorRows.filter((factor) => {
    const key = cleanText(factor.factor_key)
    const status = cleanText(factor.status)
    return key !== "has_report_channel" && (status === "evidence_found" || status === "needs_investigation")
  })

  const evidenceFoundFactors = relevantFactors.filter((factor) => cleanText(factor.status) === "evidence_found")

  const evidenceFoundLabels = evidenceFoundFactors
    .map((factor) => cleanText(factor.factor_label) || cleanText(factor.factor_key))
    .filter((value) => Boolean(value)) as string[]

  const needsInvestigationLabels = relevantFactors
    .filter((factor) => cleanText(factor.status) === "needs_investigation")
    .map((factor) => cleanText(factor.factor_label) || cleanText(factor.factor_key))
    .filter((value) => Boolean(value)) as string[]

  const hasFactor = (key: string): boolean => {
    return evidenceFoundFactors.some((factor) => cleanText(factor.factor_key) === key)
  }

  const hasReportChannel = Boolean(psychosocialRow && psychosocialRow.has_report_channel === true)
  const evidenceCount = evidenceFoundLabels.length

  const severityLevel =
    hasFactor("has_hostile_public_contact") ||
    hasFactor("has_peer_conflict") ||
    (hasFactor("has_excessive_pressure") && hasFactor("has_low_autonomy")) ||
    evidenceCount >= 4
      ? "high"
      : evidenceCount >= 1
        ? "medium"
        : "low"

  const probabilityLevel =
    evidenceCount >= 4 ||
    (hasFactor("has_work_overload") && hasFactor("has_constant_interruptions")) ||
    (hasFactor("has_excessive_pressure") && hasFactor("has_task_accumulation"))
      ? "high"
      : evidenceCount >= 1
        ? "medium"
        : "low"

  const matrixRiskLevel =
    severityLevel === "high" && probabilityLevel === "high"
      ? "high"
      : severityLevel === "high" || probabilityLevel === "high"
        ? "high"
        : severityLevel === "medium" || probabilityLevel === "medium"
          ? "medium"
          : "low"

  const reviewRiskLevel = normalizeGeneratedRiskLevel(params.reviewRow.preliminary_priority)
  const riskRank: Record<string, number> = {
    low: 1,
    medium: 2,
    high: 3,
    critical: 4,
  }

  const riskLevel =
    riskRank[matrixRiskLevel] >= riskRank[reviewRiskLevel]
      ? matrixRiskLevel
      : reviewRiskLevel

  const riskCategory = normalizeGeneratedRiskCategory(params.body.generated_risk_category)

  const factorText =
    evidenceFoundLabels.length > 0
      ? evidenceFoundLabels.join("; ")
      : textFromJsonValue(params.reviewRow.confirmed_hazards_json) || "Indicadores psicossociais observados no diagnostico guiado."

  const investigationText =
    needsInvestigationLabels.length > 0
      ? " Fatores pendentes de investigacao: " + needsInvestigationLabels.join("; ") + "."
      : ""

  const hazardFromReview =
    cleanText(params.body.generated_risk_hazard_description) ||
    textFromJsonValue(params.reviewRow.confirmed_hazards_json) ||
    "Fatores da organizacao do trabalho com potencial de gerar risco psicossocial: " + factorText

  const exposedGroup =
    textFromJsonValue(params.reviewRow.confirmed_exposed_group_json) ||
    "Trabalhadores vinculados a atividade analisada no diagnostico guiado."

  const title =
    cleanText(params.body.generated_risk_title) ||
    "Risco psicossocial preliminar gerado pelo diagnostico guiado"

  const possibleHarms =
    "Possiveis agravos ocupacionais relacionados a organizacao do trabalho, considerando exposicao coletiva ou agregada e sem registro de diagnostico clinico individual."

  const existingControls =
    hasReportChannel
      ? "Canal de relato informado no diagnostico. Validar efetividade, confidencialidade, fluxo de tratamento e retorno das medidas."
      : "Controles existentes nao confirmados no diagnostico. Validar canais de relato, apoio da lideranca, organizacao da demanda e medidas preventivas."

  const exposureCharacterization =
    "Exposicao preliminar caracterizada a partir do diagnostico guiado NR-1. Fatores evidenciados: " +
    factorText +
    "." +
    investigationText

  const recommendedMeasure =
    cleanText(params.body.generated_risk_recommended_measure) ||
    "Validar o risco preliminar com responsavel tecnico, revisar evidencias, confirmar grupo exposto, priorizar medidas organizacionais e registrar plano de acao."

  const riskPayload: Nr1RiskInsert = {
    tenant_id: params.scope.tenantId,
    establishment_id: params.establishmentId,
    department_id: departmentId,
    activity_id: activityId,
    diagnosis_session_id: params.diagnosisSessionId,
    title,
    risk_category: riskCategory,
    hazard_description: limitText(hazardFromReview, 1000),
    source_circumstance:
      cleanText(params.body.generated_risk_source_circumstance) ||
      "Diagnostico guiado NR1; fatores observados: " + limitText(factorText, 700),
    exposed_group: limitText(exposedGroup, 1000),
    possible_harms: limitText(possibleHarms, 1000),
    existing_controls: limitText(existingControls, 1000),
    exposure_characterization: limitText(exposureCharacterization, 1000),
    severity_level: severityLevel,
    probability_level: probabilityLevel,
    risk_level: riskLevel,
    classification: riskLevel,
    recommended_measure: limitText(recommendedMeasure, 1000),
    suggested_responsible: "Gestao da empresa",
    suggested_deadline: null,
    status: "identified",
  }

  const riskResult = await params.userClient
    .from("nr1_risks")
    .insert(riskPayload)
    .select("*")
    .single()

  if (riskResult.error) {
    throw new Error("nr1_generated_risk_create_failed: " + riskResult.error.message)
  }

  const riskRow = riskResult.data as { id: string } | null
  const riskId = riskRow?.id || null

  if (!riskId) {
    throw new Error("nr1_generated_risk_missing_id")
  }

  const adminClient = createNr1AdminClient()

  const auditPayload: Nr1AuditEventInsert = {
    tenant_id: params.scope.tenantId,
    establishment_id: params.establishmentId,
    module_name: "nr1",
    screen_key: "nr1_diagnosis_review",
    entity_type: "nr1_risk",
    entity_id: riskId,
    event_type: "diagnosis_review_risk_generated",
    old_value_json: null,
    new_value_json: {
      risk_id: riskId,
      diagnosis_session_id: params.diagnosisSessionId,
      diagnosis_review_id: params.reviewRow.id,
      department_id: departmentId,
      activity_id: activityId,
      risk_category: riskCategory,
      severity_level: severityLevel,
      probability_level: probabilityLevel,
      risk_level: riskLevel,
      classification: riskLevel,
      psychosocial_factor_count: evidenceCount,
      psychosocial_factors: evidenceFoundLabels,
      needs_investigation_factors: needsInvestigationLabels,
    } as Json,
    persistence_type: "formal_version",
    reason: "diagnosis_review_generate_risk",
    user_id: params.scope.membership.user_id,
  }

  const auditResult = await adminClient
    .from("nr1_audit_events")
    .insert(auditPayload)

  if (auditResult.error) {
    throw new Error("nr1_generated_risk_audit_insert_failed: " + auditResult.error.message)
  }

  return {
    generated: true,
    riskId,
    reason: "created",
  }
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
      message: "No nr1_diagnosis_sessions row found for tenant_id + establishment_id + diagnosis_session_id",
    }
  }

  if (rows.length > 1) {
    return {
      ok: false as const,
      status: 409,
      error: "nr1_diagnosis_session_duplicate",
      message: "Expected 1 diagnosis session row, got " + String(rows.length),
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

    if (!diagnosisSessionId) {
      return json(400, {
        ok: false,
        error: "missing_diagnosis_session_id",
        message: "Provide diagnosisSessionId in querystring",
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
      .from("nr1_diagnosis_review")
      .select("*")
      .eq("tenant_id", scope.tenantId)
      .eq("diagnosis_session_id", diagnosisSessionId)

    if (result.error) {
      return json(500, {
        ok: false,
        error: "nr1_diagnosis_review_get_failed",
        message: result.error.message,
      })
    }

    const rows = (result.data || []) as Nr1DiagnosisReviewRow[]

    if (rows.length === 0) {
      return json(200, {
        ok: true,
        tenantId: scope.tenantId,
        establishmentId,
        diagnosisSessionId,
        membershipRole: scope.role,
        session: {
          id: sessionCheck.row.id,
          department_id: sessionCheck.row.department_id,
          activity_id: sessionCheck.row.activity_id,
          current_stage: sessionCheck.row.current_stage,
          overall_status: sessionCheck.row.overall_status,
          progress_percent: sessionCheck.row.progress_percent,
        },
        item: null,
      })
    }

    if (rows.length > 1) {
      return json(409, {
        ok: false,
        error: "nr1_diagnosis_review_duplicate",
        message: "Expected 1 diagnosis review row, got " + String(rows.length),
      })
    }

    const row = rows[0]

    return json(200, {
      ok: true,
      tenantId: scope.tenantId,
      establishmentId,
      diagnosisSessionId,
      membershipRole: scope.role,
      session: {
        id: sessionCheck.row.id,
        department_id: sessionCheck.row.department_id,
        activity_id: sessionCheck.row.activity_id,
        current_stage: sessionCheck.row.current_stage,
        overall_status: sessionCheck.row.overall_status,
        progress_percent: sessionCheck.row.progress_percent,
      },
      item: {
        id: row.id,
        tenant_id: row.tenant_id,
        diagnosis_session_id: row.diagnosis_session_id,
        confirmed_exposed_group_json: row.confirmed_exposed_group_json,
        confirmed_hazards_json: row.confirmed_hazards_json,
        preliminary_priority: row.preliminary_priority,
        reviewed_at: row.reviewed_at,
        reviewed_by: row.reviewed_by,
        reviewer_comment: row.reviewer_comment,
        created_at: row.created_at,
        updated_at: row.updated_at,
      },
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

    let body: UpsertDiagnosisReviewBody
    try {
      body = (await req.json()) as UpsertDiagnosisReviewBody
    } catch {
      return json(400, {
        ok: false,
        error: "invalid_json",
        message: "Request body must be valid JSON",
      })
    }

    const establishmentId = cleanText(body.establishment_id)
    const diagnosisSessionId = cleanText(body.diagnosis_session_id)

    if (!establishmentId) {
      return json(400, {
        ok: false,
        error: "missing_establishment_id",
        message: "establishment_id is required",
      })
    }

    if (!diagnosisSessionId) {
      return json(400, {
        ok: false,
        error: "missing_diagnosis_session_id",
        message: "diagnosis_session_id is required",
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
        error: "nr1_diagnosis_review_upsert_forbidden",
        message: "Only owner or admin can upsert diagnosis review",
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
      .from("nr1_diagnosis_review")
      .select("*")
      .eq("tenant_id", scope.tenantId)
      .eq("diagnosis_session_id", diagnosisSessionId)

    if (existingResult.error) {
      return json(500, {
        ok: false,
        error: "nr1_diagnosis_review_existing_lookup_failed",
        message: existingResult.error.message,
      })
    }

    const existingRows = (existingResult.data || []) as Nr1DiagnosisReviewRow[]

    const reviewedAt = resolveReviewedAt(body.reviewed_at)
    const reviewedBy = reviewedAt ? scope.user.id : null

    const payload = {
      tenant_id: scope.tenantId,
      diagnosis_session_id: diagnosisSessionId,
      confirmed_exposed_group_json: normalizeJson(body.confirmed_exposed_group_json, []),
      confirmed_hazards_json: normalizeJson(body.confirmed_hazards_json, []),
      preliminary_priority: cleanText(body.preliminary_priority),
      reviewed_at: reviewedAt,
      reviewed_by: reviewedBy,
      reviewer_comment: cleanText(body.reviewer_comment),
    }

    const nowIso = new Date().toISOString()
    const sessionPromotionPayload = reviewedAt
      ? {
          current_stage: "review",
          overall_status: "review_pending",
          progress_percent: 100,
          completed_at: reviewedAt,
          reopened_at: null,
          last_saved_at: nowIso,
        }
      : {
          current_stage: "review",
          overall_status: "in_progress",
          progress_percent: 90,
          completed_at: null,
          last_saved_at: nowIso,
        }

    if (existingRows.length === 0) {
      const insertResult = await userClient
        .from("nr1_diagnosis_review")
        .insert(payload)
        .select("*")

      if (insertResult.error) {
        return json(500, {
          ok: false,
          error: "nr1_diagnosis_review_create_failed",
          message: insertResult.error.message,
        })
      }

      const rows = (insertResult.data || []) as Nr1DiagnosisReviewRow[]

      if (rows.length !== 1) {
        return json(500, {
          ok: false,
          error: "nr1_diagnosis_review_create_invalid_result",
          message: "Expected 1 inserted row, got " + String(rows.length),
        })
      }

      const row = rows[0]

      const sessionUpdateResult = await userClient
        .from("nr1_diagnosis_sessions")
        .update(sessionPromotionPayload)
        .eq("id", sessionCheck.row.id)
        .select("*")

      if (sessionUpdateResult.error) {
        return json(500, {
          ok: false,
          error: "nr1_diagnosis_session_promote_after_review_failed",
          message: sessionUpdateResult.error.message,
        })
      }

      const refreshedSessionRow =
        Array.isArray(sessionUpdateResult.data) && sessionUpdateResult.data.length > 0
          ? sessionUpdateResult.data[0]
          : sessionCheck.row

      const generatedRisk = await maybeGenerateRiskFromReview({
        body,
        scope,
        userClient,
        reviewRow: row,
        sessionRow: refreshedSessionRow,
        establishmentId,
        diagnosisSessionId,
      })

      return json(201, {
        ok: true,
        upserted: "created",
        tenantId: scope.tenantId,
        establishmentId,
        diagnosisSessionId,
        membershipRole: scope.role,
        generatedRisk,
        session: {
          id: refreshedSessionRow.id,
          department_id: refreshedSessionRow.department_id,
          activity_id: refreshedSessionRow.activity_id,
          current_stage: refreshedSessionRow.current_stage,
          overall_status: refreshedSessionRow.overall_status,
          progress_percent: refreshedSessionRow.progress_percent,
        },
        item: {
          id: row.id,
          tenant_id: row.tenant_id,
          diagnosis_session_id: row.diagnosis_session_id,
          confirmed_exposed_group_json: row.confirmed_exposed_group_json,
          confirmed_hazards_json: row.confirmed_hazards_json,
          preliminary_priority: row.preliminary_priority,
          reviewed_at: row.reviewed_at,
          reviewed_by: row.reviewed_by,
          reviewer_comment: row.reviewer_comment,
          created_at: row.created_at,
          updated_at: row.updated_at,
        },
      })
    }

    if (existingRows.length > 1) {
      return json(409, {
        ok: false,
        error: "nr1_diagnosis_review_duplicate",
        message: "Expected 1 diagnosis review row, got " + String(existingRows.length),
      })
    }

    const existingRow = existingRows[0]

    const updateResult = await userClient
      .from("nr1_diagnosis_review")
      .update(payload)
      .eq("id", existingRow.id)
      .select("*")

    if (updateResult.error) {
      return json(500, {
        ok: false,
        error: "nr1_diagnosis_review_update_failed",
        message: updateResult.error.message,
      })
    }

    const rows = (updateResult.data || []) as Nr1DiagnosisReviewRow[]

    if (rows.length !== 1) {
      return json(500, {
        ok: false,
        error: "nr1_diagnosis_review_update_invalid_result",
        message: "Expected 1 updated row, got " + String(rows.length),
      })
    }

    const row = rows[0]

    const sessionUpdateResult = await userClient
      .from("nr1_diagnosis_sessions")
      .update(sessionPromotionPayload)
      .eq("id", sessionCheck.row.id)
      .select("*")

    if (sessionUpdateResult.error) {
      return json(500, {
        ok: false,
        error: "nr1_diagnosis_session_promote_after_review_failed",
        message: sessionUpdateResult.error.message,
      })
    }

    const refreshedSessionRow =
      Array.isArray(sessionUpdateResult.data) && sessionUpdateResult.data.length > 0
        ? sessionUpdateResult.data[0]
        : sessionCheck.row

      const generatedRisk = await maybeGenerateRiskFromReview({
        body,
        scope,
        userClient,
        reviewRow: row,
        sessionRow: refreshedSessionRow,
        establishmentId,
        diagnosisSessionId,
      })

    return json(200, {
      ok: true,
      upserted: "updated",
      tenantId: scope.tenantId,
      establishmentId,
      diagnosisSessionId,
      membershipRole: scope.role,
        generatedRisk,
      session: {
        id: refreshedSessionRow.id,
        department_id: refreshedSessionRow.department_id,
        activity_id: refreshedSessionRow.activity_id,
        current_stage: refreshedSessionRow.current_stage,
        overall_status: refreshedSessionRow.overall_status,
        progress_percent: refreshedSessionRow.progress_percent,
      },
      item: {
        id: row.id,
        tenant_id: row.tenant_id,
        diagnosis_session_id: row.diagnosis_session_id,
        confirmed_exposed_group_json: row.confirmed_exposed_group_json,
        confirmed_hazards_json: row.confirmed_hazards_json,
        preliminary_priority: row.preliminary_priority,
        reviewed_at: row.reviewed_at,
        reviewed_by: row.reviewed_by,
        reviewer_comment: row.reviewer_comment,
        created_at: row.created_at,
        updated_at: row.updated_at,
      },
    })
  } catch (error) {
    const response = nr1ErrorToResponsePayload(error)
    return json(response.status, response.body)
  }
}

