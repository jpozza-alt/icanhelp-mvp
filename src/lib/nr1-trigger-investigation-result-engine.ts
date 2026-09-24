import {
  TRIGGER_INVESTIGATION_MATRIX,
  type TriggerInvestigationType,
} from "./nr1-trigger-investigation-matrix.ts"
import {
  TRIGGER_INVESTIGATION_POLICY,
  type TriggerQuestionRole,
} from "./nr1-trigger-investigation-policy.ts"

export type TriggerInvestigationSuggestedResult =
  | "no_relevant_indication"
  | "attention_point"
  | "possible_risk_factor"
  | "suggested_risk"

export type TriggerInvestigationAnswerInput = Record<
  string,
  string | null | undefined
>

export type TriggerInvestigationEvaluation = {
  complete: boolean
  suggestedResult: TriggerInvestigationSuggestedResult | null
  technicalValidationRequired: boolean
  criticalAlertRequired: boolean
  missingQuestionKeys: string[]
  invalidQuestionKeys: string[]
  unknownQuestionKeys: string[]
  adverseQuestionKeys: string[]
  criticalQuestionKeys: string[]
  technicalValidationQuestionKeys: string[]
  adverseRoles: TriggerQuestionRole[]
  adverseGroups: {
    exposureOrFrequency: boolean
    control: boolean
    impactOrEvidence: boolean
  }
}

const YES_NO_VALUES = new Set(["yes", "no", "unknown"])

function normalizeAnswer(
  value: string | null | undefined,
): string {
  return typeof value === "string"
    ? value.trim().toLowerCase()
    : ""
}

export function evaluateTriggerInvestigation(
  triggerType: TriggerInvestigationType,
  answers: TriggerInvestigationAnswerInput,
): TriggerInvestigationEvaluation {
  const definition = TRIGGER_INVESTIGATION_MATRIX[triggerType]
  const triggerPolicy = TRIGGER_INVESTIGATION_POLICY[triggerType]

  const missingQuestionKeys: string[] = []
  const invalidQuestionKeys: string[] = []
  const unknownQuestionKeys: string[] = []
  const adverseQuestionKeys: string[] = []
  const criticalQuestionKeys: string[] = []
  const technicalValidationQuestionKeys: string[] = []

  const adverseRoles = new Set<TriggerQuestionRole>()

  for (const question of definition.questions) {
    const answer = normalizeAnswer(answers[question.key])
    const questionPolicy = triggerPolicy[question.key]

    if (!answer) {
      if (question.required) {
        missingQuestionKeys.push(question.key)
      }

      continue
    }

    if (question.kind === "yes_no") {
      if (!YES_NO_VALUES.has(answer)) {
        invalidQuestionKeys.push(question.key)
        continue
      }

      if (answer === "unknown") {
        unknownQuestionKeys.push(question.key)
        continue
      }
    }

    if (question.kind === "text") {
      continue
    }

    if (
      questionPolicy.adverseWhen &&
      answer === questionPolicy.adverseWhen
    ) {
      adverseQuestionKeys.push(question.key)

      for (const role of questionPolicy.roles) {
        adverseRoles.add(role)
      }
    }

    if (
      questionPolicy.criticalWhen &&
      answer === questionPolicy.criticalWhen
    ) {
      criticalQuestionKeys.push(question.key)
    }

    if (
      questionPolicy.technicalValidationWhen &&
      answer === questionPolicy.technicalValidationWhen
    ) {
      technicalValidationQuestionKeys.push(question.key)
    }
  }

  const isCriticalTrigger =
    triggerType === "harassment_or_violence"

  const criticalAlertRequired =
    isCriticalTrigger ||
    criticalQuestionKeys.length > 0

  const technicalValidationRequired =
    criticalAlertRequired ||
    unknownQuestionKeys.length > 0 ||
    technicalValidationQuestionKeys.length > 0

  const complete =
    missingQuestionKeys.length === 0 &&
    invalidQuestionKeys.length === 0

  const exposureOrFrequency =
    adverseRoles.has("exposure") ||
    adverseRoles.has("frequency")

  const control =
    adverseRoles.has("control")

  const impactOrEvidence =
    adverseRoles.has("impact") ||
    adverseRoles.has("evidence")

  const adverseGroups = {
    exposureOrFrequency,
    control,
    impactOrEvidence,
  }

  if (!complete) {
    return {
      complete: false,
      suggestedResult: null,
      technicalValidationRequired,
      criticalAlertRequired,
      missingQuestionKeys,
      invalidQuestionKeys,
      unknownQuestionKeys,
      adverseQuestionKeys,
      criticalQuestionKeys,
      technicalValidationQuestionKeys,
      adverseRoles: Array.from(adverseRoles),
      adverseGroups,
    }
  }

  let suggestedResult: TriggerInvestigationSuggestedResult

  const adverseGroupCount = [
    exposureOrFrequency,
    control,
    impactOrEvidence,
  ].filter(Boolean).length

  if (adverseGroupCount === 3) {
    suggestedResult = "suggested_risk"
  } else if (adverseGroupCount === 2) {
    suggestedResult = "possible_risk_factor"
  } else if (
    adverseGroupCount === 1 ||
    adverseQuestionKeys.length > 0
  ) {
    suggestedResult = "attention_point"
  } else {
    suggestedResult = "no_relevant_indication"
  }

  return {
    complete: true,
    suggestedResult,
    technicalValidationRequired,
    criticalAlertRequired,
    missingQuestionKeys,
    invalidQuestionKeys,
    unknownQuestionKeys,
    adverseQuestionKeys,
    criticalQuestionKeys,
    technicalValidationQuestionKeys,
    adverseRoles: Array.from(adverseRoles),
    adverseGroups,
  }
}


