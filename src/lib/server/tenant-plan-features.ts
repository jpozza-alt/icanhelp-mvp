import "server-only"

import { createNr1AdminClient } from "@/lib/server/nr1-scope"

type AnyRecord = Record<string, unknown>

type DbError = {
  message: string
}

type DbSingleResult = {
  data: AnyRecord | null
  error: DbError | null
}

type DbListResult = {
  data: AnyRecord[] | null
  error: DbError | null
}

type DbQuery = PromiseLike<DbListResult> & {
  select: (columns?: string) => DbQuery
  eq: (column: string, value: string | boolean) => DbQuery
  in: (column: string, values: string[]) => DbQuery
  order: (column: string, options?: { ascending?: boolean }) => DbQuery
  maybeSingle: () => PromiseLike<DbSingleResult>
}

type PlanFeatureDbClient = {
  from: (table: string) => DbQuery
}

export type TenantPlanFeaturesAccess = {
  subscriptionSource: "tenant_subscription" | "fallback_essencial"
  subscription: AnyRecord | null
  plan: AnyRecord
  subscriptionStatus: string
  isEntitled: boolean
  planIsActive: boolean
  featureKeys: string[]
  featureFlags: Record<string, boolean>
  features: AnyRecord[]
}

export class TenantPlanFeaturesError extends Error {
  readonly status: 404 | 500
  readonly code: string

  constructor(status: 404 | 500, code: string, message: string) {
    super(message)
    this.name = "TenantPlanFeaturesError"
    this.status = status
    this.code = code
  }
}

function asPlanFeatureDbClient(value: unknown): PlanFeatureDbClient {
  return value as PlanFeatureDbClient
}

function asRecord(value: unknown): AnyRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {}
  return value as AnyRecord
}

function readString(value: unknown, key: string): string {
  const raw = asRecord(value)[key]
  return typeof raw === "string" ? raw : ""
}

function readBoolean(value: unknown, key: string): boolean {
  const raw = asRecord(value)[key]
  return typeof raw === "boolean" ? raw : false
}

function buildFeatureFlags(features: AnyRecord[]): Record<string, boolean> {
  const flags: Record<string, boolean> = {}

  for (const feature of features) {
    const key = readString(feature, "feature_key")
    if (key) flags[key] = true
  }

  return flags
}

async function getPlanBySlug(adminClient: PlanFeatureDbClient, slug: string) {
  const result = await adminClient
    .from("subscription_plans")
    .select("id, slug, name, description, is_active, sort_order")
    .eq("slug", slug)
    .maybeSingle()

  if (result.error) {
    return { ok: false as const, error: result.error.message, plan: null }
  }

  return { ok: true as const, error: null, plan: result.data ?? null }
}

async function getPlanById(adminClient: PlanFeatureDbClient, planId: string) {
  const result = await adminClient
    .from("subscription_plans")
    .select("id, slug, name, description, is_active, sort_order")
    .eq("id", planId)
    .maybeSingle()

  if (result.error) {
    return { ok: false as const, error: result.error.message, plan: null }
  }

  return { ok: true as const, error: null, plan: result.data ?? null }
}

async function getEnabledFeatures(
  adminClient: PlanFeatureDbClient,
  planId: string,
): Promise<AnyRecord[]> {
  const planFeaturesResult = await adminClient
    .from("plan_features")
    .select("feature_id, is_enabled")
    .eq("subscription_plan_id", planId)
    .eq("is_enabled", true)

  if (planFeaturesResult.error) {
    throw new Error(planFeaturesResult.error.message)
  }

  const featureIds = (planFeaturesResult.data || [])
    .map((item) => readString(item, "feature_id"))
    .filter(Boolean)

  if (featureIds.length === 0) return []

  const featuresResult = await adminClient
    .from("features")
    .select("id, feature_key, name, description, module, is_active")
    .in("id", featureIds)
    .eq("is_active", true)
    .order("feature_key", { ascending: true })

  if (featuresResult.error) {
    throw new Error(featuresResult.error.message)
  }

  return (featuresResult.data || []).filter((feature) =>
    Boolean(readString(feature, "feature_key")),
  )
}

export async function resolveTenantPlanFeatures(
  tenantId: string,
): Promise<TenantPlanFeaturesAccess> {
  const adminClient = asPlanFeatureDbClient(createNr1AdminClient())

  const subscriptionResult = await adminClient
    .from("tenant_subscriptions")
    .select("id, tenant_id, subscription_plan_id, status, starts_at, expires_at, trial_ends_at, billing_cycle")
    .eq("tenant_id", tenantId)
    .maybeSingle()

  if (subscriptionResult.error) {
    throw new TenantPlanFeaturesError(
      500,
      "tenant_subscription_lookup_failed",
      subscriptionResult.error.message,
    )
  }

  const subscription = subscriptionResult.data ?? null
  const subscriptionStatus = subscription ? readString(subscription, "status") : "fallback"
  const entitledStatuses = ["trial", "active", "past_due", "fallback"]
  const isEntitled = entitledStatuses.includes(subscriptionStatus)
  const subscriptionPlanId = subscription
    ? readString(subscription, "subscription_plan_id")
    : ""

  const planResult = subscriptionPlanId
    ? await getPlanById(adminClient, subscriptionPlanId)
    : await getPlanBySlug(adminClient, "essencial")

  if (!planResult.ok) {
    throw new TenantPlanFeaturesError(
      500,
      "subscription_plan_lookup_failed",
      planResult.error || "Failed to load subscription plan",
    )
  }

  if (!planResult.plan) {
    throw new TenantPlanFeaturesError(
      404,
      "subscription_plan_not_found",
      "No subscription plan found for tenant",
    )
  }

  const plan = planResult.plan
  const planIsActive = readBoolean(plan, "is_active")
  const features = isEntitled && planIsActive
    ? await getEnabledFeatures(adminClient, readString(plan, "id"))
    : []
  const featureKeys = features
    .map((feature) => readString(feature, "feature_key"))
    .filter(Boolean)
  const featureFlags = buildFeatureFlags(features)

  return {
    subscriptionSource: subscription ? "tenant_subscription" : "fallback_essencial",
    subscription,
    plan,
    subscriptionStatus,
    isEntitled,
    planIsActive,
    featureKeys,
    featureFlags,
    features,
  }
}

export function knowledgeDomainFeatureKey(domain: string): string | null {
  if (domain === "organizational") return "organizational_reading"
  if (domain === "governmental") return "governmental_reading"
  return null
}

export function hasKnowledgeDomainFeature(
  access: TenantPlanFeaturesAccess,
  domain: string,
): boolean {
  const featureKey = knowledgeDomainFeatureKey(domain)
  return featureKey ? access.featureFlags[featureKey] === true : false
}
