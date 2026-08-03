import { NextRequest, NextResponse } from "next/server"
import {
  nr1ErrorToResponsePayload,
  resolveNr1Scope,
} from "@/lib/server/nr1-scope"
import {
  resolveTenantPlanFeatures,
  TenantPlanFeaturesError,
} from "@/lib/server/tenant-plan-features"

export const dynamic = "force-dynamic"

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

    const {
      subscriptionSource,
      subscription,
      plan,
      subscriptionStatus,
      isEntitled,
      planIsActive,
      featureKeys,
      featureFlags,
      features,
    } = await resolveTenantPlanFeatures(scope.tenantId)

    return json(200, {
      ok: true,
      tenantId: scope.tenantId,
      membershipRole: scope.role,
      subscriptionSource,
      subscription,
      plan,
      access: {
        status: subscriptionStatus,
        isEntitled,
        planIsActive,
      },
      featureKeys,
      featureFlags,
      features,
    })
  } catch (error) {
    if (error instanceof TenantPlanFeaturesError) {
      return json(error.status, {
        ok: false,
        error: error.code,
        message: error.message,
      })
    }

    const response = nr1ErrorToResponsePayload(error)
    return json(response.status, response.body)
  }
}
