import { NextRequest, NextResponse } from "next/server"
import {
  createNr1AdminClient,
  nr1ErrorToResponsePayload,
  resolveNr1Scope,
} from "@/lib/server/nr1-scope"

export const dynamic = "force-dynamic"

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

function asPlanFeatureDbClient(value: unknown): PlanFeatureDbClient {
  return value as PlanFeatureDbClient
}

function json(status: number, payload: Record<string, unknown>) {
  return NextResponse.json(payload, { status })
}

function cleanText(value: string | null): string {
  return (value || "").trim()
}

function getTenantId(req: NextRequest): string {
  const queryValue = cleanText(req.nextUrl.searchParams.get("tenantId"))
  const querySnakeValue = cleanText(req.nextUrl.searchParams.get("tenant_id"))
  const headerValue = cleanText(req.headers.get("x-icanhelp-tenant"))
  const headerTenantId = cleanText(req.headers.get("x-tenant-id"))
  const headerTenant = cleanText(req.headers.get("x-tenant"))

  return queryValue || querySnakeValue || headerValue || headerTenantId || headerTenant
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

async function getEnabledFeatures(adminClient: PlanFeatureDbClient, planId: string): Promise<AnyRecord[]> {
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

  return featuresResult.data || []
}

export async function GET(req: NextRequest) {
  try {
    const tenantId = getTenantId(req)

    if (!tenantId) {
      return json(400, {
        ok: false,
        error: "missing_tenant_id",
        message: "Provide tenantId in querystring or x-icanhelp-tenant header",
      })
    }

    const scope = await resolveNr1Scope({
      req,
      tenantId,
    })

    const adminClient = asPlanFeatureDbClient(createNr1AdminClient())

    const subscriptionResult = await adminClient
      .from("tenant_subscriptions")
      .select("id, tenant_id, subscription_plan_id, status, starts_at, expires_at, trial_ends_at, billing_cycle")
      .eq("tenant_id", scope.tenantId)
      .maybeSingle()

    if (subscriptionResult.error) {
      return json(500, {
        ok: false,
        error: "tenant_subscription_lookup_failed",
        message: subscriptionResult.error.message,
      })
    }

    const subscription = subscriptionResult.data ?? null
    const subscriptionStatus = subscription ? readString(subscription, "status") : "fallback"
    const entitledStatuses = ["trial", "active", "past_due", "fallback"]
    const isEntitled = entitledStatuses.includes(subscriptionStatus)

    let planResult

    if (subscription && readString(subscription, "subscription_plan_id")) {
      planResult = await getPlanById(adminClient, readString(subscription, "subscription_plan_id"))
    } else {
      planResult = await getPlanBySlug(adminClient, "essencial")
    }

    if (!planResult.ok) {
      return json(500, {
        ok: false,
        error: "subscription_plan_lookup_failed",
        message: planResult.error || "Failed to load subscription plan",
      })
    }

    if (!planResult.plan) {
      return json(404, {
        ok: false,
        error: "subscription_plan_not_found",
        message: "No subscription plan found for tenant",
      })
    }

    const plan = planResult.plan
    const planIsActive = readBoolean(plan, "is_active")
    const features = isEntitled && planIsActive
      ? await getEnabledFeatures(adminClient, readString(plan, "id"))
      : []

    const featureKeys = features
      .map((feature) => readString(feature, "feature_key"))
      .filter(Boolean)

    return json(200, {
      ok: true,
      tenantId: scope.tenantId,
      membershipRole: scope.role,
      subscriptionSource: subscription ? "tenant_subscription" : "fallback_essencial",
      subscription,
      plan,
      access: {
        status: subscriptionStatus,
        isEntitled,
        planIsActive,
      },
      featureKeys,
      featureFlags: buildFeatureFlags(features),
      features,
    })
  } catch (error) {
    const response = nr1ErrorToResponsePayload(error)
    return json(response.status, response.body)
  }
}
