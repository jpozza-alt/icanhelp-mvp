import type {
  TriggerInvestigationSuggestedResult,
} from "./nr1-trigger-investigation-result-engine.ts"

export type TriggerInvestigationValidationType =
  | "human"
  | "technical"

export type TriggerInvestigationValidationStatus =
  | "pending"
  | "validated"
  | "rejected"
  | "needs_more_information"
  | "revoked"

export type TriggerInvestigationValidationDecision =
  | "confirm_result"
  | "adjust_result"
  | "reject_result"
  | "request_more_information"

export type TriggerInvestigationValidationInput = {
  decision: TriggerInvestigationValidationDecision
  suggestedResult: TriggerInvestigationSuggestedResult
  adjustedResult?: TriggerInvestigationSuggestedResult | null
}

export type TriggerInvestigationValidationOutcome = {
  validationStatus:
    | "validated"
    | "rejected"
    | "needs_more_information"
  decisionType: TriggerInvestigationValidationDecision
  validatedResult: TriggerInvestigationSuggestedResult | null
  reopenInvestigation: boolean
}

export function resolveTriggerInvestigationValidation(
  input: TriggerInvestigationValidationInput,
): TriggerInvestigationValidationOutcome {
  if (input.decision === "confirm_result") {
    return {
      validationStatus: "validated",
      decisionType: "confirm_result",
      validatedResult: input.suggestedResult,
      reopenInvestigation: false,
    }
  }

  if (input.decision === "adjust_result") {
    if (!input.adjustedResult) {
      throw new Error(
        "adjusted_result_required",
      )
    }

    return {
      validationStatus: "validated",
      decisionType: "adjust_result",
      validatedResult: input.adjustedResult,
      reopenInvestigation: false,
    }
  }

  if (input.decision === "reject_result") {
    return {
      validationStatus: "rejected",
      decisionType: "reject_result",
      validatedResult: null,
      reopenInvestigation: false,
    }
  }

  if (input.decision === "request_more_information") {
    return {
      validationStatus: "needs_more_information",
      decisionType: "request_more_information",
      validatedResult: null,
      reopenInvestigation: true,
    }
  }

  const exhaustiveCheck: never = input.decision

  throw new Error(
    `unsupported_validation_decision:${exhaustiveCheck}`,
  )
}

