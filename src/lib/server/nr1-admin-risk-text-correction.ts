import type { Database, Json } from "@/lib/database.types"

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const REQUIRED_KEYS = [
  "establishment_id",
  "risk_id",
  "diagnosis_session_id",
  "diagnosis_review_id",
  "expected_risk_title",
  "expected_risk_exposed_group",
  "expected_risk_source_circumstance",
  "expected_risk_hazard_description",
  "expected_risk_exposure_characterization",
  "expected_risk_updated_at",
  "expected_review_exposed_group_json",
  "expected_review_updated_at",
  "new_risk_title",
  "new_risk_exposed_group",
  "new_risk_source_circumstance",
  "new_risk_hazard_description",
  "new_risk_exposure_characterization",
  "new_review_label",
  "reason",
] as const

type RequiredKey = (typeof REQUIRED_KEYS)[number]

export type Nr1AdminRiskTextCorrectionInput = {
  establishment_id: string
  risk_id: string
  diagnosis_session_id: string
  diagnosis_review_id: string
  expected_risk_title: string
  expected_risk_exposed_group: string
  expected_risk_source_circumstance: string
  expected_risk_hazard_description: string
  expected_risk_exposure_characterization: string | null
  expected_risk_updated_at: string
  expected_review_exposed_group_json: Json
  expected_review_updated_at: string
  new_risk_title: string
  new_risk_exposed_group: string
  new_risk_source_circumstance: string
  new_risk_hazard_description: string
  new_risk_exposure_characterization: string
  new_review_label: string
  reason: string
}

export type ParseCorrectionResult =
  | { ok: true; value: Nr1AdminRiskTextCorrectionInput }
  | { ok: false; error: string; message: string }

type CorrectionRpcArgs =
  Database["public"]["Functions"]["nr1_admin_correct_diagnosis_risk_texts_v2"]["Args"]

type CorrectionRole = string

type CorrectionScope = {
  tenantId: string
  role: CorrectionRole
  user: { id: string }
}

type CorrectionRpcResult = {
  data: Json | null
  error: { code?: string; message?: string } | null
}

export type CorrectionHttpResult = {
  status: number
  body: Record<string, unknown>
}

export type Nr1AdminRiskTextCorrectionDependencies = {
  resolveScope: (input: {
    req: Request
    tenantId: string
    establishmentId: string
  }) => Promise<CorrectionScope>
  isTenantAdminRole: (role: CorrectionRole) => boolean
  callRpc: (args: CorrectionRpcArgs) => Promise<CorrectionRpcResult>
  mapScopeError: (error: unknown) => CorrectionHttpResult
}

export const SANITIZED_CORRECTION_ERROR_MESSAGE =
  "Unable to apply the administrative correction"

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function requiredText(
  body: Record<string, unknown>,
  key: RequiredKey,
  maxLength: number,
): string | null {
  const value = body[key]
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  return trimmed.length > 0 && trimmed.length <= maxLength ? trimmed : null
}

function requiredNullableText(
  body: Record<string, unknown>,
  key: RequiredKey,
  maxLength: number,
): string | null | undefined {
  const value = body[key]
  if (value === null) return null
  if (typeof value !== "string") return undefined
  const trimmed = value.trim()
  return trimmed.length > 0 && trimmed.length <= maxLength ? trimmed : undefined
}

function isTimestamp(value: string): boolean {
  return !Number.isNaN(Date.parse(value))
}

export function parseNr1AdminRiskTextCorrectionBody(body: unknown): ParseCorrectionResult {
  if (!isRecord(body)) {
    return { ok: false, error: "invalid_body", message: "Request body must be a JSON object" }
  }

  const unknownKeys = Object.keys(body).filter(
    (key) => !REQUIRED_KEYS.includes(key as RequiredKey),
  )
  if (unknownKeys.length > 0) {
    return {
      ok: false,
      error: "unexpected_fields",
      message: "Unexpected fields: " + unknownKeys.sort().join(", "),
    }
  }

  const missingKeys = REQUIRED_KEYS.filter((key) => body[key] === undefined)
  if (missingKeys.length > 0) {
    return {
      ok: false,
      error: "missing_fields",
      message: "Missing fields: " + missingKeys.join(", "),
    }
  }

  const establishmentId = requiredText(body, "establishment_id", 36)
  const riskId = requiredText(body, "risk_id", 36)
  const diagnosisSessionId = requiredText(body, "diagnosis_session_id", 36)
  const diagnosisReviewId = requiredText(body, "diagnosis_review_id", 36)
  const ids = [establishmentId, riskId, diagnosisSessionId, diagnosisReviewId]

  if (ids.some((value) => !value || !UUID_PATTERN.test(value))) {
    return {
      ok: false,
      error: "invalid_ids",
      message: "All record identifiers must be valid UUIDs",
    }
  }

  const expectedRiskTitle = requiredText(body, "expected_risk_title", 1000)
  const expectedRiskExposedGroup = requiredText(body, "expected_risk_exposed_group", 1000)
  const expectedRiskSourceCircumstance = requiredText(
    body,
    "expected_risk_source_circumstance",
    1000,
  )
  const expectedRiskHazardDescription = requiredText(
    body,
    "expected_risk_hazard_description",
    4000,
  )
  const expectedRiskExposureCharacterization = requiredNullableText(
    body,
    "expected_risk_exposure_characterization",
    4000,
  )
  const expectedRiskUpdatedAt = requiredText(body, "expected_risk_updated_at", 64)
  const expectedReviewUpdatedAt = requiredText(body, "expected_review_updated_at", 64)
  const newRiskTitle = requiredText(body, "new_risk_title", 1000)
  const newRiskExposedGroup = requiredText(body, "new_risk_exposed_group", 1000)
  const newRiskSourceCircumstance = requiredText(body, "new_risk_source_circumstance", 1000)
  const newRiskHazardDescription = requiredText(body, "new_risk_hazard_description", 4000)
  const newRiskExposureCharacterization = requiredText(
    body,
    "new_risk_exposure_characterization",
    4000,
  )
  const newReviewLabel = requiredText(body, "new_review_label", 1000)
  const reason = requiredText(body, "reason", 500)

  if (
    !expectedRiskTitle ||
    !expectedRiskExposedGroup ||
    !expectedRiskSourceCircumstance ||
    !expectedRiskHazardDescription ||
    expectedRiskExposureCharacterization === undefined ||
    !newRiskTitle ||
    !newRiskExposedGroup ||
    !newRiskSourceCircumstance ||
    !newRiskHazardDescription ||
    !newRiskExposureCharacterization ||
    !newReviewLabel ||
    !reason
  ) {
    return {
      ok: false,
      error: "invalid_text_fields",
      message: "Text fields must be non-empty and within their allowed lengths",
    }
  }

  if (
    !expectedRiskUpdatedAt ||
    !expectedReviewUpdatedAt ||
    !isTimestamp(expectedRiskUpdatedAt) ||
    !isTimestamp(expectedReviewUpdatedAt)
  ) {
    return {
      ok: false,
      error: "invalid_updated_at",
      message: "Expected updated_at values must be valid timestamps",
    }
  }

  const expectedReviewJson = body.expected_review_exposed_group_json
  if (
    !Array.isArray(expectedReviewJson) ||
    expectedReviewJson.length !== 1 ||
    !isRecord(expectedReviewJson[0])
  ) {
    return {
      ok: false,
      error: "invalid_expected_review_json",
      message: "expected_review_exposed_group_json must contain exactly one object",
    }
  }

  return {
    ok: true,
    value: {
      establishment_id: establishmentId!,
      risk_id: riskId!,
      diagnosis_session_id: diagnosisSessionId!,
      diagnosis_review_id: diagnosisReviewId!,
      expected_risk_title: expectedRiskTitle,
      expected_risk_exposed_group: expectedRiskExposedGroup,
      expected_risk_source_circumstance: expectedRiskSourceCircumstance,
      expected_risk_hazard_description: expectedRiskHazardDescription,
      expected_risk_exposure_characterization: expectedRiskExposureCharacterization,
      expected_risk_updated_at: expectedRiskUpdatedAt,
      expected_review_exposed_group_json: expectedReviewJson as Json,
      expected_review_updated_at: expectedReviewUpdatedAt,
      new_risk_title: newRiskTitle,
      new_risk_exposed_group: newRiskExposedGroup,
      new_risk_source_circumstance: newRiskSourceCircumstance,
      new_risk_hazard_description: newRiskHazardDescription,
      new_risk_exposure_characterization: newRiskExposureCharacterization,
      new_review_label: newReviewLabel,
      reason,
    },
  }
}

function rpcErrorResult(code: string | undefined): CorrectionHttpResult {
  if (code === "40001") {
    return {
      status: 409,
      body: {
        ok: false,
        error: "correction_precondition_failed",
        message: "The risk or review changed after the expected values were read",
      },
    }
  }

  if (code === "P0002") {
    return {
      status: 404,
      body: {
        ok: false,
        error: "correction_target_not_found",
        message: "No correction target was found in the supplied scope",
      },
    }
  }

  if (code === "22023" || code === "23514") {
    return {
      status: 400,
      body: {
        ok: false,
        error: "invalid_correction_request",
        message: "The correction request does not satisfy the required contract",
      },
    }
  }

  return {
    status: 500,
    body: {
      ok: false,
      error: "nr1_admin_risk_text_correction_failed",
      message: SANITIZED_CORRECTION_ERROR_MESSAGE,
    },
  }
}

function sanitizeMappedError(result: CorrectionHttpResult): CorrectionHttpResult {
  return result.status >= 500 ? rpcErrorResult(undefined) : result
}

export async function executeNr1AdminRiskTextCorrection(
  input: {
    req: Request
    tenantId: string
    rawBody: unknown
  },
  dependencies: Nr1AdminRiskTextCorrectionDependencies,
): Promise<CorrectionHttpResult> {
  if (!input.tenantId) {
    return {
      status: 400,
      body: {
        ok: false,
        error: "missing_tenant_id",
        message: "Provide tenantId in querystring or x-icanhelp-tenant header",
      },
    }
  }

  const parsed = parseNr1AdminRiskTextCorrectionBody(input.rawBody)
  if (parsed.ok === false) {
    return {
      status: 400,
      body: { ok: false, error: parsed.error, message: parsed.message },
    }
  }

  try {
    const scope = await dependencies.resolveScope({
      req: input.req,
      tenantId: input.tenantId,
      establishmentId: parsed.value.establishment_id,
    })

    if (!dependencies.isTenantAdminRole(scope.role)) {
      return {
        status: 403,
        body: {
          ok: false,
          error: "nr1_admin_risk_text_correction_forbidden",
          message: "Only owner or admin can correct diagnosis risk texts",
        },
      }
    }

    const body = parsed.value
    const result = await dependencies.callRpc({
      p_tenant_id: scope.tenantId,
      p_establishment_id: body.establishment_id,
      p_risk_id: body.risk_id,
      p_diagnosis_session_id: body.diagnosis_session_id,
      p_diagnosis_review_id: body.diagnosis_review_id,
      p_expected_risk_title: body.expected_risk_title,
      p_expected_risk_exposed_group: body.expected_risk_exposed_group,
      p_expected_risk_source_circumstance: body.expected_risk_source_circumstance,
      p_expected_risk_hazard_description: body.expected_risk_hazard_description,
      p_expected_risk_exposure_characterization:
        body.expected_risk_exposure_characterization,
      p_expected_risk_updated_at: body.expected_risk_updated_at,
      p_expected_review_exposed_group_json: body.expected_review_exposed_group_json,
      p_expected_review_updated_at: body.expected_review_updated_at,
      p_new_risk_title: body.new_risk_title,
      p_new_risk_exposed_group: body.new_risk_exposed_group,
      p_new_risk_source_circumstance: body.new_risk_source_circumstance,
      p_new_risk_hazard_description: body.new_risk_hazard_description,
      p_new_risk_exposure_characterization: body.new_risk_exposure_characterization,
      p_new_review_label: body.new_review_label,
      p_actor_user_id: scope.user.id,
      p_reason: body.reason,
    })

    if (result.error) return rpcErrorResult(result.error.code)

    return {
      status: 200,
      body: { ok: true, correction: result.data },
    }
  } catch (error) {
    return sanitizeMappedError(dependencies.mapScopeError(error))
  }
}
