export type Nr1PlanFeatureAccess = {
  status: string
  isEntitled: boolean
  planIsActive: boolean
}

export type Nr1PlanFeaturePlan = {
  id?: string
  slug?: string
  name?: string
  description?: string | null
  is_active?: boolean
  sort_order?: number
}

export type Nr1PlanFeaturesResponse = {
  ok: boolean
  tenantId: string
  membershipRole: string
  subscriptionSource: string
  subscription: Record<string, unknown> | null
  plan: Nr1PlanFeaturePlan
  access: Nr1PlanFeatureAccess
  featureKeys: string[]
  featureFlags: Record<string, boolean>
  features: Record<string, unknown>[]
}

export type GetNr1PlanFeaturesInput = {
  tenantId: string
  accessToken: string
  baseUrl?: string
}

function cleanBaseUrl(value?: string): string {
  if (!value) return ""
  return value.replace(/\/+$/, "")
}

export async function getNr1PlanFeatures(input: GetNr1PlanFeaturesInput): Promise<Nr1PlanFeaturesResponse> {
  const tenantId = input.tenantId.trim()
  const accessToken = input.accessToken.trim()

  if (!tenantId) {
    throw new Error("tenantId is required")
  }

  if (!accessToken) {
    throw new Error("accessToken is required")
  }

  const baseUrl = cleanBaseUrl(input.baseUrl)
  const url = baseUrl
    ? baseUrl + "/api/nr1/plan-features?tenantId=" + encodeURIComponent(tenantId)
    : "/api/nr1/plan-features?tenantId=" + encodeURIComponent(tenantId)

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: "Bearer " + accessToken,
      "x-icanhelp-tenant": tenantId,
    },
    cache: "no-store",
  })

  const payload = await response.json()

  if (!response.ok || !payload.ok) {
    const message =
      typeof payload.message === "string"
        ? payload.message
        : "Failed to load NR1 plan features"

    throw new Error(message)
  }

  return payload as Nr1PlanFeaturesResponse
}

export function hasNr1Feature(
  flags: Record<string, boolean> | null | undefined,
  featureKey: string,
): boolean {
  if (!flags) return false
  return flags[featureKey] === true
}
