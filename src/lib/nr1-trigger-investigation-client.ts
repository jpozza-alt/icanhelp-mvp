import {
  TRIGGER_INVESTIGATION_MATRIX,
  type TriggerInvestigationType,
} from "@/lib/nr1-trigger-investigation-matrix"

export type TriggerInvestigationUiItem = {
  id: string
  trigger_type: TriggerInvestigationType
  trigger_label?: string | null
  investigation_status?: string | null
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
  }

  return {
    investigations,
    answers,
  }
}
