import { NextRequest, NextResponse } from "next/server"
import type { Database, Json } from "@/lib/database.types"
import type {
  Nr1DiagnosisReviewRow,
  Nr1DiagnosisSessionRow,
} from "@/lib/nr1-db-types"
import {
  createNr1UserClientFromBearer,
  extractBearerToken,
  isTenantAdminRole,
  nr1ErrorToResponsePayload,
  resolveNr1Scope,
  type Nr1Scope,
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
  explicit_conversion?: boolean
  trigger_investigation_id?: string
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

const EXPOSED_GROUP_FALLBACK = "Trabalhadores vinculados à atividade analisada no diagnóstico guiado."

function exposedGroupLabelFromJson(value: unknown): string | null {
  const entries = Array.isArray(value) ? value : [value]
  const labels: string[] = []

  for (const entry of entries) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      return null
    }

    const label = cleanText((entry as Record<string, unknown>).label)
    if (
      !label ||
      /\btenant[-_]/i.test(label) ||
      /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i.test(label)
    ) {
      return null
    }

    labels.push(label)
  }

  return labels.length > 0 ? labels.join("; ") : null
}

function limitText(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value
  return value.slice(0, maxLength)
}

async function maybeGenerateRiskFromReview(params: {
  body: UpsertDiagnosisReviewBody
  scope: Nr1Scope
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
  // C5.4 - trigger result gate:
  // Gatilho nao e risco.
  // Investigacao de gatilho somente pode virar risco quando houver:
  // - conversao humana explicita;
  // - validacao humana vigente e valida;
  // - validacao tecnica vigente quando exigida;
  // - effective_result = suggested_risk.

  let conversionInvestigationId: string | null = null

  const requestedConversionInvestigationId =
    cleanText(params.body.trigger_investigation_id)

  const explicitConversionRequested =
    params.body.explicit_conversion === true

  const triggerInvestigationResult = await params.userClient
    .from("nr1_trigger_investigations")
    .select(
      "id,investigation_status,trigger_type,technical_validation_required,critical_alert_required",
    )
    .eq("tenant_id", params.scope.tenantId)
    .eq("establishment_id", params.establishmentId)
    .eq("diagnosis_session_id", params.diagnosisSessionId)
    .is("deleted_at", null)

  if (triggerInvestigationResult.error) {
    throw new Error(
      "nr1_generated_risk_trigger_investigation_lookup_failed: " +
        triggerInvestigationResult.error.message,
    )
  }

  const triggerInvestigations =
    (triggerInvestigationResult.data || []) as Array<{
      id: string
      investigation_status: string | null
      trigger_type: string | null
      technical_validation_required: boolean | null
      critical_alert_required: boolean | null
    }>

  if (triggerInvestigations.length > 0) {
    if (
      !explicitConversionRequested ||
      !requestedConversionInvestigationId
    ) {
      return {
        generated: false,
        riskId: null,
        reason: "explicit_conversion_required",
      }
    }

    const conversionInvestigation =
      triggerInvestigations.find(
        (investigation) =>
          cleanText(investigation.id) ===
          requestedConversionInvestigationId,
      ) || null

    if (!conversionInvestigation) {
      return {
        generated: false,
        riskId: null,
        reason: "conversion_investigation_not_found",
      }
    }

    if (
      cleanText(
        conversionInvestigation.investigation_status,
      ) !== "completed"
    ) {
      return {
        generated: false,
        riskId: null,
        reason: "investigation_required",
      }
    }

    const validationResult = await params.userClient
      .from("nr1_trigger_investigation_validations")
      .select(
        "id,validation_type,validation_status,validated_result,created_at,revoked_at,source_snapshot_json",
      )
      .eq("tenant_id", params.scope.tenantId)
      .eq("establishment_id", params.establishmentId)
      .eq(
        "trigger_investigation_id",
        requestedConversionInvestigationId,
      )
      .is("revoked_at", null)
      .neq("validation_status", "revoked")
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })

    if (validationResult.error) {
      throw new Error(
        "nr1_generated_risk_validation_lookup_failed: " +
          validationResult.error.message,
      )
    }

    const validationRows =
      (validationResult.data || []) as Array<{
        id: string
        validation_type: string | null
        validation_status: string | null
        validated_result: string | null
        created_at: string | null
        revoked_at: string | null
        source_snapshot_json: Json | null
      }>

    const currentHumanValidation =
      validationRows.find(
        (validation) =>
          cleanText(validation.validation_type) ===
          "human",
      ) || null

    if (
      !currentHumanValidation ||
      cleanText(
        currentHumanValidation.validation_status,
      ) !== "validated" ||
      !cleanText(
        currentHumanValidation.validated_result,
      )
    ) {
      return {
        generated: false,
        riskId: null,
        reason: "human_validation_required",
      }
    }

    let effectiveResult =
      cleanText(
        currentHumanValidation.validated_result,
      )

    if (
      conversionInvestigation
        .technical_validation_required === true
    ) {
      const currentTechnicalValidation =
        validationRows.find(
          (validation) =>
            cleanText(
              validation.validation_type,
            ) === "technical",
        ) || null

      if (
        !currentTechnicalValidation ||
        cleanText(
          currentTechnicalValidation.validation_status,
        ) !== "validated" ||
        !cleanText(
          currentTechnicalValidation.validated_result,
        )
      ) {
        return {
          generated: false,
          riskId: null,
          reason: "technical_validation_required",
        }
      }

      const technicalSourceSnapshot =
        currentTechnicalValidation.source_snapshot_json

      const technicalSourceRecord =
        technicalSourceSnapshot &&
        typeof technicalSourceSnapshot === "object" &&
        !Array.isArray(technicalSourceSnapshot)
          ? (technicalSourceSnapshot as Record<string, unknown>)
          : null

      const technicalHumanValidationId =
        technicalSourceRecord
          ? cleanText(
              technicalSourceRecord.human_validation_id,
            )
          : null

      const technicalHumanValidatedResult =
        technicalSourceRecord
          ? cleanText(
              technicalSourceRecord.human_validated_result,
            )
          : null

      const currentHumanValidationId =
        cleanText(currentHumanValidation.id)

      const currentHumanValidatedResult =
        cleanText(
          currentHumanValidation.validated_result,
        )

      if (
        !technicalHumanValidationId ||
        !currentHumanValidationId ||
        technicalHumanValidationId !==
          currentHumanValidationId ||
        !technicalHumanValidatedResult ||
        technicalHumanValidatedResult !==
          currentHumanValidatedResult
      ) {
        return {
          generated: false,
          riskId: null,
          reason: "technical_validation_stale",
        }
      }

      effectiveResult =
        cleanText(
          currentTechnicalValidation.validated_result,
        )
    }

    if (effectiveResult !== "suggested_risk") {
      return {
        generated: false,
        riskId: null,
        reason: "effective_result_not_convertible",
      }
    }

    conversionInvestigationId =
      requestedConversionInvestigationId
  }

  type ExistingRiskRow = {
    id: string
    status: string | null
    title: string | null
    risk_category: string | null
    diagnosis_session_id: string | null
    deleted_at: string | null
  }

  let existingRisk: ExistingRiskRow | null = null

  // Conversao explicita de investigacao deve gerar/vincular
  // o risco daquela investigacao. Nao reutilizar outro risco
  // apenas porque pertence a mesma sessao de diagnostico.
  if (!conversionInvestigationId) {
    const existingRiskResult = await params.userClient
      .from("nr1_risks")
      .select(
        "id,status,title,risk_category,diagnosis_session_id,deleted_at",
      )
      .eq("tenant_id", params.scope.tenantId)
      .eq("establishment_id", params.establishmentId)
      .eq(
        "diagnosis_session_id",
        params.diagnosisSessionId,
      )
      .limit(1)

    if (existingRiskResult.error) {
      throw new Error(
        "nr1_generated_risk_existing_lookup_failed: " +
          existingRiskResult.error.message,
      )
    }

    const existingRows =
      (existingRiskResult.data || []) as ExistingRiskRow[]

    existingRisk = existingRows[0] || null
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

  const hasSupportingEvidence = (factor: Record<string, unknown>): boolean => {
    const sources = Array.isArray(factor.sources) ? factor.sources : []

    const hasSourceEvidence = sources.some((source) => {
      if (typeof source === "string") {
        return Boolean(cleanText(source))
      }

      if (source && typeof source === "object" && !Array.isArray(source)) {
        return Object.keys(source as Record<string, unknown>).length > 0
      }

      return false
    })

    return (
      hasSourceEvidence ||
      Boolean(cleanText(factor.justification)) ||
      Boolean(cleanText(factor.evidence_summary))
    )
  }

  const evidenceFoundFactors = relevantFactors.filter(
    (factor) => cleanText(factor.status) === "evidence_found" && hasSupportingEvidence(factor),
  )

  const evidenceFoundLabels = evidenceFoundFactors
    .map((factor) => cleanText(factor.factor_label) || cleanText(factor.factor_key))
    .filter((value) => Boolean(value)) as string[]

  const needsInvestigationLabels = relevantFactors
    .filter((factor) => {
      const status = cleanText(factor.status)

      return (
        status === "needs_investigation" ||
        factor.investigation_pending === true ||
        (status === "evidence_found" && !hasSupportingEvidence(factor))
      )
    })
    .map((factor) => cleanText(factor.factor_label) || cleanText(factor.factor_key))
    .filter((value) => Boolean(value)) as string[]

  if (

    needsInvestigationLabels.length > 0 &&

    !conversionInvestigationId

  ) {

    return {

      generated: false,

      riskId: null,

      reason: "investigation_required",

    }

  }

  if (

    evidenceFoundLabels.length === 0 &&

    !conversionInvestigationId

  ) {

    return {

      generated: false,

      riskId: null,

      reason: "no_confirmed_evidence",

    }

  }

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
    exposedGroupLabelFromJson(params.reviewRow.confirmed_exposed_group_json) || EXPOSED_GROUP_FALLBACK

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

  let riskId: string | null = null
  let riskPersistenceAction: "created" | "updated" = "created"

  if (existingRisk) {
    const existingRiskId = cleanText(existingRisk.id)
    const existingRiskStatus = cleanText(existingRisk.status)
    const existingRiskTitle = cleanText(existingRisk.title)
    const existingRiskCategory = cleanText(existingRisk.risk_category)
    const existingRiskDeletedAt = cleanText(existingRisk.deleted_at)

    const isGeneratedDiagnosisRisk =
      existingRiskTitle === "Risco sugerido a partir da revisao dos pontos" ||
      existingRiskTitle === "Risco preliminar gerado pelo diagnostico guiado" ||
      existingRiskTitle === "Risco psicossocial preliminar gerado pelo diagnostico guiado"

    const canUpdateExistingGeneratedRisk =
      !existingRiskDeletedAt &&
      existingRiskStatus === "identified" &&
      existingRiskCategory === "psychosocial" &&
      isGeneratedDiagnosisRisk

    if (!canUpdateExistingGeneratedRisk) {
      return {
        generated: false,
        riskId: existingRiskId || null,
        reason: "existing_requires_manual_review",
      }
    }

    const updatePayload = {
      title: riskPayload.title,
      risk_category: riskPayload.risk_category,
      hazard_description: riskPayload.hazard_description,
      source_circumstance: riskPayload.source_circumstance,
      exposed_group: riskPayload.exposed_group,
      possible_harms: riskPayload.possible_harms,
      existing_controls: riskPayload.existing_controls,
      exposure_characterization: riskPayload.exposure_characterization,
      severity_level: riskPayload.severity_level,
      probability_level: riskPayload.probability_level,
      risk_level: riskPayload.risk_level,
      classification: riskPayload.classification,
      recommended_measure: riskPayload.recommended_measure,
      suggested_responsible: riskPayload.suggested_responsible,
      suggested_deadline: riskPayload.suggested_deadline,
      status: riskPayload.status,
      updated_by: params.scope.membership.user_id,
    }

    const updateResult = await params.userClient
      .from("nr1_risks")
      .update(updatePayload)
      .eq("id", existingRiskId)
      .eq("tenant_id", params.scope.tenantId)
      .select("id")
      .single()

    if (updateResult.error) {
      throw new Error("nr1_generated_risk_update_failed: " + updateResult.error.message)
    }

    riskId = cleanText(updateResult.data?.id) || existingRiskId
    riskPersistenceAction = "updated"
  } else {
    const riskResult = await params.userClient
      .from("nr1_risks")
      .insert(riskPayload)
      .select("*")
      .single()

    if (riskResult.error) {
      throw new Error("nr1_generated_risk_create_failed: " + riskResult.error.message)
    }

    const riskRow = riskResult.data as { id: string } | null
    riskId = riskRow?.id || null
  }

  if (!riskId) {
    throw new Error("nr1_generated_risk_missing_id")
  }

  if (conversionInvestigationId) {
    const conversionResult = await params.userClient
      .from("nr1_trigger_investigations")
      .update({
        investigation_status: "converted_to_risk",
        generated_risk_id: riskId,
        updated_by: params.scope.membership.user_id,
      })
      .eq("id", conversionInvestigationId)
      .eq("tenant_id", params.scope.tenantId)
      .eq("establishment_id", params.establishmentId)
      .eq("investigation_status", "completed")
      .select("id,investigation_status")
      .single()

    if (conversionResult.error) {
      throw new Error(
        "nr1_trigger_investigation_conversion_update_failed: " +
          conversionResult.error.message,
      )
    }
  }

  const auditPayload: Nr1AuditEventInsert = {
    tenant_id: params.scope.tenantId,
    establishment_id: params.establishmentId,
    module_name: "nr1",
    screen_key: "nr1_diagnosis_review",
    entity_type: "nr1_risk",
    entity_id: riskId,
    event_type: riskPersistenceAction === "updated" ? "diagnosis_review_risk_updated" : "diagnosis_review_risk_generated",
    old_value_json: existingRisk ? ({ risk_id: existingRisk.id, status: existingRisk.status, title: existingRisk.title, risk_category: existingRisk.risk_category } as Json) : null,
    new_value_json: {
      risk_id: riskId,
      persistence_action: riskPersistenceAction,
      diagnosis_session_id: params.diagnosisSessionId,
      diagnosis_review_id: params.reviewRow.id,
      trigger_investigation_id:
        conversionInvestigationId,
      explicit_conversion:
        conversionInvestigationId !== null,
      effective_result:
        conversionInvestigationId
          ? "suggested_risk"
          : null,
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
    reason: conversionInvestigationId
      ? "trigger_investigation_explicit_conversion"
      : "diagnosis_review_generate_risk",
    user_id: params.scope.membership.user_id,
  }

  const auditResult = await params.userClient
    .from("nr1_audit_events")
    .insert(auditPayload)

  if (auditResult.error) {
    throw new Error("nr1_generated_risk_audit_insert_failed: " + auditResult.error.message)
  }

  return {
    generated: true,
    riskId,
    reason: riskPersistenceAction,
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

