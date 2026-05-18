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

async function getNr1PlanFeaturesRaw(input: GetNr1PlanFeaturesInput): Promise<Nr1PlanFeaturesResponse> {
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


// NR1 plan feature compatibility mapping.
// Keeps the workspace contract stable while using real plan feature keys from the API.
const NR1_INTELLIGENT_FEATURE_ALIASES: Record<string, readonly string[]> = {
  iso45003_engine: ["iso45003_engine", "nr1_motor_iso_45003", "nr1.motor_iso_45003"],
  psychosocial_radar: ["psychosocial_radar", "nr1_radar_psicossocial", "nr1.radar_psicossocial"],
  psychosocial_scoring: ["psychosocial_scoring", "nr1_score_psicossocial", "nr1.score_psicossocial"],
  smart_alerts: ["smart_alerts", "nr1_alertas_inteligentes", "nr1.alertas_inteligentes"],
  automatic_prioritization: ["automatic_prioritization", "nr1_priorizacao_automatica", "nr1.priorizacao_automatica"],
};

type Nr1FeatureFlagRecord = Record<string, boolean>;

function collectNr1FeatureKeysFromPayload(payload: unknown): Set<string> {
  const keys = new Set<string>();

  const visit = (node: unknown): void => {
    if (!node || typeof node !== "object") return;

    if (Array.isArray(node)) {
      node.forEach(visit);
      return;
    }

    const record = node as Record<string, unknown>;
    const rawKey = record.feature_key ?? record.featureKey;

    if (typeof rawKey === "string" && rawKey.trim()) {
      keys.add(rawKey.trim());
    }

    const featureFlags = record.featureFlags;
    if (featureFlags && typeof featureFlags === "object" && !Array.isArray(featureFlags)) {
      for (const [key, value] of Object.entries(featureFlags as Record<string, unknown>)) {
        if (value === true) keys.add(key);
      }
    }

    Object.values(record).forEach(visit);
  };

  visit(payload);
  return keys;
}

function hasAnyNr1Feature(keys: Set<string>, aliases: readonly string[]): boolean {
  return aliases.some((key) => keys.has(key));
}

function applyNr1FeatureFlagCompatibility<T>(response: T): T {
  if (!response || typeof response !== "object") return response;

  const record = response as Record<string, unknown>;
  const existingFeatureFlags =
    record.featureFlags && typeof record.featureFlags === "object" && !Array.isArray(record.featureFlags)
      ? (record.featureFlags as Record<string, unknown>)
      : {};

  const keys = collectNr1FeatureKeysFromPayload(response);
  const featureFlags: Nr1FeatureFlagRecord = {};

  for (const [key, value] of Object.entries(existingFeatureFlags)) {
    featureFlags[key] = value === true;
  }

  for (const key of keys) {
    featureFlags[key] = true;
  }

  featureFlags.iso45003_engine = hasAnyNr1Feature(keys, NR1_INTELLIGENT_FEATURE_ALIASES.iso45003_engine);
  featureFlags.psychosocial_radar = hasAnyNr1Feature(keys, NR1_INTELLIGENT_FEATURE_ALIASES.psychosocial_radar);
  featureFlags.psychosocial_scoring = hasAnyNr1Feature(keys, NR1_INTELLIGENT_FEATURE_ALIASES.psychosocial_scoring);
  featureFlags.smart_alerts = hasAnyNr1Feature(keys, NR1_INTELLIGENT_FEATURE_ALIASES.smart_alerts);
  featureFlags.automatic_prioritization = hasAnyNr1Feature(keys, NR1_INTELLIGENT_FEATURE_ALIASES.automatic_prioritization);

  return {
    ...record,
    featureFlags,
  } as T;
}

export async function getNr1PlanFeatures(
  ...args: Parameters<typeof getNr1PlanFeaturesRaw>
): Promise<Awaited<ReturnType<typeof getNr1PlanFeaturesRaw>>> {
  const response = await getNr1PlanFeaturesRaw(...args);
  return applyNr1FeatureFlagCompatibility(response);
}