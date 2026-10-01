import {
  TRIGGER_INVESTIGATION_MATRIX,
  type TriggerInvestigationType,
} from "@/lib/nr1-trigger-investigation-matrix"

export type TriggerInvestigationUiItem = {
  id: string
  trigger_type: TriggerInvestigationType
  trigger_label?: string | null
  investigation_status?: string | null
  suggested_result?: string | null
  technical_validation_required?: boolean
  critical_alert_required?: boolean
  generated_risk_id?: string | null
  human_validation?: TriggerInvestigationValidationUiState | null
  technical_validation?: TriggerInvestigationValidationUiState | null
  technical_validation_current?: boolean
  effective_result?: string | null
}

export type TriggerInvestigationValidationUiState = {
  id: string
  validation_type: string
  validation_status: string
  decision_type?: string | null
  validated_result?: string | null
  created_at?: string | null
  validated_at?: string | null
}

export type TriggerInvestigationAnswerState =
  Record<string, string>

export type Nr1TriggerInvestigationContext = {
  tenantId: string | null
  establishmentId: string | null
}

export type Nr1TriggerInvestigationRequest = (
  path: string,
  init: RequestInit,
  context: Nr1TriggerInvestigationContext,
) => Promise<unknown>

export type Nr1TriggerInvestigationBuildUrl = (
  path: string,
  params: Record<string, string | null | undefined>,
) => string

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(
    value &&
      typeof value === "object" &&
      !Array.isArray(value),
  )
}

function firstString(
  value: unknown,
  keys: string[],
): string | null {
  if (!isRecord(value)) return null

  for (const key of keys) {
    const candidate = value[key]

    if (typeof candidate === "string") {
      const trimmed = candidate.trim()

      if (trimmed) return trimmed
    }
  }

  return null
}

export async function openTriggerInvestigationClient(params: {
  request: Nr1TriggerInvestigationRequest
  buildUrl: Nr1TriggerInvestigationBuildUrl
  context: Nr1TriggerInvestigationContext
  diagnosisSessionId: string
  triggerType: TriggerInvestigationType
}): Promise<TriggerInvestigationUiItem> {
  const {
    request,
    buildUrl,
    context,
    diagnosisSessionId,
    triggerType,
  } = params

  if (!context.tenantId || !context.establishmentId) {
    throw new Error(
      "Selecione a empresa e o local de trabalho antes de investigar este ponto.",
    )
  }

  const path = buildUrl(
    "/api/nr1/trigger-investigations",
    {
      tenantId: context.tenantId,
    },
  )

  const response = await request(
    path,
    {
      method: "POST",
      body: JSON.stringify({
        establishment_id: context.establishmentId,
        diagnosis_session_id: diagnosisSessionId,
        trigger_type: triggerType,
      }),
    },
    context,
  )

  const responseItem =
    isRecord(response) && isRecord(response.item)
      ? response.item
      : null

  const investigationId =
    firstString(responseItem, ["id"])

  if (!investigationId) {
    throw new Error(
      "A investigação foi aberta, mas a API não retornou seu identificador.",
    )
  }

  return {
    id: investigationId,
    trigger_type: triggerType,
    trigger_label:
      firstString(responseItem, ["trigger_label"]) ||
      TRIGGER_INVESTIGATION_MATRIX[triggerType].label,
    investigation_status:
      firstString(responseItem, ["investigation_status"]) ||
      "in_investigation",
  }
}

export async function saveTriggerInvestigationAnswerClient(params: {
  request: Nr1TriggerInvestigationRequest
  buildUrl: Nr1TriggerInvestigationBuildUrl
  context: Nr1TriggerInvestigationContext
  investigationId: string
  questionKey: string
  answerValue: string
}): Promise<void> {
  const {
    request,
    buildUrl,
    context,
    investigationId,
    questionKey,
    answerValue,
  } = params

  if (!context.tenantId || !context.establishmentId) {
    throw new Error(
      "Selecione a empresa e o local de trabalho antes de salvar a resposta.",
    )
  }

  const path = buildUrl(
    `/api/nr1/trigger-investigations/${investigationId}/answers`,
    {
      tenantId: context.tenantId,
    },
  )

  await request(
    path,
    {
      method: "POST",
      body: JSON.stringify({
        establishment_id: context.establishmentId,
        question_key: questionKey,
        answer_value: answerValue,
        answer_json: {},
      }),
    },
    context,
  )
}

export type TriggerInvestigationHumanValidationResult = {
  validationId: string
  validationStatus: string
  decisionType: string | null
  validatedResult: string | null
  technicalValidationRequired: boolean
  criticalAlertRequired: boolean
  reopenInvestigation: boolean
  nextInvestigationStatus: string
}

export async function validateTriggerInvestigationHumanClient(params: {
  request: Nr1TriggerInvestigationRequest
  buildUrl: Nr1TriggerInvestigationBuildUrl
  context: Nr1TriggerInvestigationContext
  investigationId: string
  decision?: "confirm_result"
  notes?: string | null
}): Promise<TriggerInvestigationHumanValidationResult> {
  const {
    request,
    buildUrl,
    context,
    investigationId,
    decision = "confirm_result",
    notes = null,
  } = params

  if (!context.tenantId || !context.establishmentId) {
    throw new Error(
      "Selecione a empresa e o local de trabalho antes de confirmar o resultado.",
    )
  }

  const path = buildUrl(
    `/api/nr1/trigger-investigations/${investigationId}/human-validation`,
    {
      tenantId: context.tenantId,
    },
  )

  const payload = await request(
    path,
    {
      method: "POST",
      body: JSON.stringify({
        establishment_id: context.establishmentId,
        decision,
        notes,
      }),
    },
    context,
  )

  if (!isRecord(payload)) {
    throw new Error(
      "A validação humana foi enviada, mas a API retornou uma resposta inválida.",
    )
  }

  const validationId =
    firstString(payload, ["validationId"])

  const validationStatus =
    firstString(payload, ["validationStatus"])

  const nextInvestigationStatus =
    firstString(payload, ["nextInvestigationStatus"])

  if (
    !validationId ||
    !validationStatus ||
    !nextInvestigationStatus
  ) {
    throw new Error(
      "A validação humana foi registrada, mas faltam dados para atualizar a tela.",
    )
  }

  return {
    validationId,
    validationStatus,
    decisionType:
      firstString(payload, ["decisionType"]),
    validatedResult:
      firstString(payload, ["validatedResult"]),
    technicalValidationRequired:
      payload.technicalValidationRequired === true,
    criticalAlertRequired:
      payload.criticalAlertRequired === true,
    reopenInvestigation:
      payload.reopenInvestigation === true,
    nextInvestigationStatus,
  }
}
export type TriggerInvestigationTechnicalValidationResult = {
  validationId: string
  validationStatus: string
  decisionType: string | null
  validatedResult: string | null
  reopenInvestigation: boolean
  nextInvestigationStatus: string
}

export async function validateTriggerInvestigationTechnicalClient(params: {
  request: Nr1TriggerInvestigationRequest
  buildUrl: Nr1TriggerInvestigationBuildUrl
  context: Nr1TriggerInvestigationContext
  investigationId: string
  decision?: "confirm_result"
  notes?: string | null
}): Promise<TriggerInvestigationTechnicalValidationResult> {
  const {
    request,
    buildUrl,
    context,
    investigationId,
    decision = "confirm_result",
    notes = null,
  } = params

  if (!context.tenantId || !context.establishmentId) {
    throw new Error(
      "Selecione a empresa e o local de trabalho antes de registrar a validação técnica.",
    )
  }

  const path = buildUrl(
    `/api/nr1/trigger-investigations/${investigationId}/technical-validation`,
    {
      tenantId: context.tenantId,
    },
  )

  const payload = await request(
    path,
    {
      method: "POST",
      body: JSON.stringify({
        establishment_id: context.establishmentId,
        decision,
        notes,
      }),
    },
    context,
  )

  if (!isRecord(payload)) {
    throw new Error(
      "A validação técnica foi enviada, mas a API retornou uma resposta inválida.",
    )
  }

  const validationId =
    firstString(payload, ["validationId"])

  const validationStatus =
    firstString(payload, ["validationStatus"])

  const nextInvestigationStatus =
    firstString(payload, ["nextInvestigationStatus"])

  if (
    !validationId ||
    !validationStatus ||
    !nextInvestigationStatus
  ) {
    throw new Error(
      "A validação técnica foi registrada, mas faltam dados para atualizar a tela.",
    )
  }

  return {
    validationId,
    validationStatus,
    decisionType:
      firstString(payload, ["decisionType"]),
    validatedResult:
      firstString(payload, ["validatedResult"]),
    reopenInvestigation:
      payload.reopenInvestigation === true,
    nextInvestigationStatus,
  }
}
export type TriggerInvestigationRiskConversionResult = {
  riskId: string
  reason: string
}

export async function convertTriggerInvestigationToRiskClient(params: {
  request: Nr1TriggerInvestigationRequest
  buildUrl: Nr1TriggerInvestigationBuildUrl
  context: Nr1TriggerInvestigationContext
  diagnosisSessionId: string
  investigationId: string
}): Promise<TriggerInvestigationRiskConversionResult> {
  const {
    request,
    buildUrl,
    context,
    diagnosisSessionId,
    investigationId,
  } = params

  if (
    !context.tenantId ||
    !context.establishmentId ||
    !diagnosisSessionId
  ) {
    throw new Error(
      "Selecione a empresa, o local de trabalho e conclua o diagnóstico antes de converter o resultado em risco.",
    )
  }

  const reviewGetPath = buildUrl(
    "/api/nr1/diagnosis-review",
    {
      tenantId: context.tenantId,
      establishmentId: context.establishmentId,
      diagnosisSessionId,
    },
  )

  const reviewPayload = await request(
    reviewGetPath,
    { method: "GET" },
    context,
  )

  const reviewItem =
    isRecord(reviewPayload) &&
    isRecord(reviewPayload.item)
      ? reviewPayload.item
      : null

  if (!reviewItem) {
    throw new Error(
      "A revisão do diagnóstico não foi encontrada. Revise o diagnóstico antes de converter o resultado em risco.",
    )
  }

  const path = buildUrl(
    "/api/nr1/diagnosis-review",
    {
      tenantId: context.tenantId,
    },
  )

  const payload = await request(
    path,
    {
      method: "POST",
      body: JSON.stringify({
        establishment_id:
          context.establishmentId,
        diagnosis_session_id:
          diagnosisSessionId,

        confirmed_exposed_group_json:
          reviewItem.confirmed_exposed_group_json ?? [],
        confirmed_hazards_json:
          reviewItem.confirmed_hazards_json ?? [],
        preliminary_priority:
          reviewItem.preliminary_priority ?? null,
        reviewer_comment:
          reviewItem.reviewer_comment ?? null,
        reviewed_at:
          reviewItem.reviewed_at ?? null,

        generate_risk: true,
        explicit_conversion: true,
        trigger_investigation_id:
          investigationId,
      }),
    },
    context,
  )

  const generatedRisk =
    isRecord(payload) &&
    isRecord(payload.generatedRisk)
      ? payload.generatedRisk
      : null

  if (!generatedRisk) {
    throw new Error(
      "A conversão foi solicitada, mas a API não retornou o resultado da criação do risco.",
    )
  }

  const generated =
    generatedRisk.generated === true

  const riskId =
    firstString(generatedRisk, [
      "riskId",
      "risk_id",
      "id",
    ])

  const reason =
    firstString(generatedRisk, ["reason"]) ||
    "not_informed"

  if (!generated || !riskId) {
    throw new Error(
      "Conversão em risco não concluída: " + reason,
    )
  }

  return {
    riskId,
    reason,
  }
}
export async function loadTriggerInvestigationsClient(params: {
  request: Nr1TriggerInvestigationRequest
  buildUrl: Nr1TriggerInvestigationBuildUrl
  context: Nr1TriggerInvestigationContext
  diagnosisSessionId: string
}): Promise<{
  investigations: Partial<
    Record<TriggerInvestigationType, TriggerInvestigationUiItem>
  >
  answers: Record<string, TriggerInvestigationAnswerState>
}> {
  const {
    request,
    buildUrl,
    context,
    diagnosisSessionId,
  } = params

  if (
    !context.tenantId ||
    !context.establishmentId ||
    !diagnosisSessionId
  ) {
    return {
      investigations: {},
      answers: {},
    }
  }

  const path = buildUrl(
    "/api/nr1/trigger-investigations",
    {
      tenantId: context.tenantId,
      establishmentId: context.establishmentId,
      diagnosisSessionId,
    },
  )

  const payload = await request(
    path,
    { method: "GET" },
    context,
  )

  const rawItems =
    isRecord(payload) && Array.isArray(payload.items)
      ? payload.items
      : []

  const investigations: Partial<
    Record<TriggerInvestigationType, TriggerInvestigationUiItem>
  > = {}

  const answers: Record<
    string,
    TriggerInvestigationAnswerState
  > = {}

  for (const rawItem of rawItems) {
    if (!isRecord(rawItem)) continue

    const investigationId =
      firstString(rawItem, ["id"])

    const rawTriggerType =
      firstString(rawItem, ["trigger_type"])

    if (
      !investigationId ||
      !rawTriggerType ||
      !(rawTriggerType in TRIGGER_INVESTIGATION_MATRIX)
    ) {
      continue
    }

    const triggerType =
      rawTriggerType as TriggerInvestigationType

    investigations[triggerType] = {
      id: investigationId,
      trigger_type: triggerType,
      trigger_label:
        firstString(rawItem, ["trigger_label"]) ||
        TRIGGER_INVESTIGATION_MATRIX[triggerType].label,
      investigation_status:
        firstString(rawItem, ["investigation_status"]) ||
        null,
      suggested_result:
        firstString(rawItem, [
          "suggested_result",
          "suggestedResult",
        ]) || null,
      technical_validation_required:
        rawItem.technical_validation_required === true ||
        rawItem.technicalValidationRequired === true,
      critical_alert_required:
        rawItem.critical_alert_required === true ||
        rawItem.criticalAlertRequired === true,
    }

    const answerPath = buildUrl(
      `/api/nr1/trigger-investigations/${investigationId}/answers`,
      {
        tenantId: context.tenantId,
        establishmentId: context.establishmentId,
      },
    )

    const answerPayload = await request(
      answerPath,
      { method: "GET" },
      context,
    )

    const rawAnswers =
      isRecord(answerPayload) &&
      Array.isArray(answerPayload.items)
        ? answerPayload.items
        : []

    const answerState: TriggerInvestigationAnswerState = {}

    for (const rawAnswer of rawAnswers) {
      if (!isRecord(rawAnswer)) continue

      const questionKey =
        firstString(rawAnswer, ["question_key"])

      const answerValue =
        firstString(rawAnswer, ["answer_value"])

      if (questionKey && answerValue !== null) {
        answerState[questionKey] = answerValue
      }
    }

    answers[investigationId] = answerState

    const validationPath = buildUrl(
      `/api/nr1/trigger-investigations/${investigationId}/validations`,
      {
        tenantId: context.tenantId,
        establishmentId: context.establishmentId,
      },
    )

    const validationPayload = await request(
      validationPath,
      { method: "GET" },
      context,
    )

    if (isRecord(validationPayload)) {
      const humanValidation =
        isRecord(validationPayload.humanValidation)
          ? validationPayload.humanValidation
          : null

      const technicalValidation =
        isRecord(validationPayload.technicalValidation)
          ? validationPayload.technicalValidation
          : null

      const mapValidation = (
        raw: Record<string, unknown> | null,
      ): TriggerInvestigationValidationUiState | null => {
        if (!raw) return null

        const id = firstString(raw, ["id"])
        const validationType =
          firstString(raw, ["validation_type"])
        const validationStatus =
          firstString(raw, ["validation_status"])

        if (
          !id ||
          !validationType ||
          !validationStatus
        ) {
          return null
        }

        return {
          id,
          validation_type: validationType,
          validation_status: validationStatus,
          decision_type:
            firstString(raw, ["decision_type"]),
          validated_result:
            firstString(raw, ["validated_result"]),
          created_at:
            firstString(raw, ["created_at"]),
          validated_at:
            firstString(raw, ["validated_at"]),
        }
      }

      investigations[triggerType] = {
        ...investigations[triggerType]!,
        generated_risk_id:
          firstString(validationPayload, [
            "generatedRiskId",
            "generated_risk_id",
          ]),
        human_validation:
          mapValidation(humanValidation),
        technical_validation:
          mapValidation(technicalValidation),
        technical_validation_current:
          validationPayload.technicalValidationCurrent === true,
        effective_result:
          firstString(validationPayload, [
            "effectiveResult",
            "effective_result",
          ]),
      }
    }
  }

  return {
    investigations,
    answers,
  }
}

export type TriggerInvestigationCompletionResult = {
  investigationStatus: string
  suggestedResult: string | null
  technicalValidationRequired: boolean
  criticalAlertRequired: boolean
}

export async function completeTriggerInvestigationClient(params: {
  request: Nr1TriggerInvestigationRequest
  buildUrl: Nr1TriggerInvestigationBuildUrl
  context: Nr1TriggerInvestigationContext
  investigationId: string
}): Promise<TriggerInvestigationCompletionResult> {
  const {
    request,
    buildUrl,
    context,
    investigationId,
  } = params

  if (!context.tenantId || !context.establishmentId) {
    throw new Error(
      "Contexto da empresa ou estabelecimento não está disponível.",
    )
  }

  const payload = await request(
    buildUrl(
      `/api/nr1/trigger-investigations/${encodeURIComponent(
        investigationId,
      )}/complete`,
      {
        tenantId: context.tenantId,
        establishmentId: context.establishmentId,
      },
    ),
    {
      method: "POST",
      body: JSON.stringify({
        establishment_id: context.establishmentId,
      }),
    },
    context,
  )

  if (!isRecord(payload)) {
    throw new Error(
      "Resposta inválida ao concluir investigação.",
    )
  }

  const investigationStatus =
    firstString(payload, [
      "investigationStatus",
      "investigation_status",
    ]) || "completed"

  const suggestedResult =
    firstString(payload, [
      "suggestedResult",
      "suggested_result",
    ])

  return {
    investigationStatus,
    suggestedResult,
    technicalValidationRequired:
      payload.technicalValidationRequired === true ||
      payload.technical_validation_required === true,
    criticalAlertRequired:
      payload.criticalAlertRequired === true ||
      payload.critical_alert_required === true,
  }
}


