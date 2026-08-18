import { NextRequest, NextResponse } from "next/server"
import {
  createNr1AdminClient,  resolveNr1Scope,
} from "@/lib/server/nr1-scope"

export const dynamic = "force-dynamic"

function json(status: number, payload: unknown) {
  return NextResponse.json(payload, { status })
}

function cleanText(value: unknown): string | null {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function getTenantId(req: NextRequest): string {
  const queryValue = cleanText(req.nextUrl.searchParams.get("tenantId"))
  const headerValue = cleanText(req.headers.get("x-icanhelp-tenant"))
  return queryValue || headerValue || ""
}

function getRequiredEstablishmentId(req: NextRequest): string {
  const establishmentId =
    cleanText(req.nextUrl.searchParams.get("establishmentId")) ||
    cleanText(req.nextUrl.searchParams.get("establishment_id"))

  if (!establishmentId) {
    throw new Error("missing_establishment_id")
  }

  return establishmentId
}

function readString(value: unknown, keys: string[]): string | null {
  if (!value || typeof value !== "object") return null

  const record = value as Record<string, unknown>

  for (const key of keys) {
    const raw = record[key]
    if (typeof raw === "string" && raw.trim().length > 0) {
      return raw.trim()
    }
  }

  return null
}

function isTenantMembershipDenied(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? "")
  return message.includes("No tenant_memberships row found for tenant_id + user_id")
}

function isMissingEstablishment(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? "")
  return message.includes("missing_establishment_id")
}

export async function GET(req: NextRequest) {
  try {
    const tenantId = getTenantId(req)

    if (!tenantId) {
      return json(400, {
        ok: false,
        error: "missing_tenant",
        message: "Missing tenant scope",
      })
    }

    const establishmentId = getRequiredEstablishmentId(req)

    const scope = await resolveNr1Scope({
      req,
      tenantId,
      establishmentId,
    })

    const adminClient = createNr1AdminClient()

    const establishmentResult = await adminClient
      .from("nr1_establishments")
      .select("*")
      .eq("tenant_id", scope.tenantId)
      .eq("id", establishmentId)
      .maybeSingle()

    if (establishmentResult.error) {
      return json(500, {
        ok: false,
        error: "pgr_report_establishment_lookup_failed",
        message: establishmentResult.error.message,
      })
    }

    if (!establishmentResult.data) {
      return json(404, {
        ok: false,
        error: "establishment_not_found",
        message: "Establishment not found for this tenant",
      })
    }

    const companyId = readString(establishmentResult.data, ["company_id", "companyId"])

    let company: unknown = null

    if (companyId) {
      const companyResult = await adminClient
        .from("nr1_companies")
        .select("*")
        .eq("tenant_id", scope.tenantId)
        .eq("id", companyId)
        .maybeSingle()

      if (companyResult.error) {
        return json(500, {
          ok: false,
          error: "pgr_report_company_lookup_failed",
          message: companyResult.error.message,
        })
      }

      company = companyResult.data ?? null
    }

    const departmentsResult = await adminClient
      .from("nr1_departments")
      .select("*")
      .eq("tenant_id", scope.tenantId)
      .eq("establishment_id", establishmentId)
      .order("name", { ascending: true })

    const activitiesResult = await adminClient
      .from("nr1_activities")
      .select("*")
      .eq("tenant_id", scope.tenantId)
      .eq("establishment_id", establishmentId)
      .order("created_at", { ascending: true })

    const risksResult = await adminClient
      .from("nr1_risks")
      .select("*")
      .eq("tenant_id", scope.tenantId)
      .eq("establishment_id", establishmentId)
      .order("created_at", { ascending: false })

    const actionPlansResult = await adminClient
      .from("nr1_action_plans")
      .select("*")
      .eq("tenant_id", scope.tenantId)
      .eq("establishment_id", establishmentId)
      .order("created_at", { ascending: false })

    const actionFollowupsResult = await adminClient
      .from("nr1_action_followups")
      .select("*")
      .eq("tenant_id", scope.tenantId)
      .order("created_at", { ascending: false })

    const evidenceResult = await adminClient
      .from("nr1_evidence_items")
      .select("*")
      .eq("tenant_id", scope.tenantId)
      .eq("establishment_id", establishmentId)
      .order("created_at", { ascending: false })

    const auditResult = await adminClient
      .from("nr1_audit_events")
      .select("*")
      .eq("tenant_id", scope.tenantId)
      .eq("establishment_id", establishmentId)
      .order("created_at", { ascending: false })
      .limit(200)

    const healthRefsResult = await adminClient
      .from("nr1_occupational_health_refs")
      .select("*")
      .eq("tenant_id", scope.tenantId)
      .eq("establishment_id", establishmentId)
      .order("created_at", { ascending: false })

    const trainingResult = await adminClient
      .from("nr1_training_records")
      .select("*")
      .eq("tenant_id", scope.tenantId)
      .eq("establishment_id", establishmentId)
      .order("created_at", { ascending: false })

    const queryErrors = [
      ["departments", departmentsResult.error],
      ["activities", activitiesResult.error],
      ["risks", risksResult.error],
      ["actionPlans", actionPlansResult.error],
      ["actionFollowups", actionFollowupsResult.error],
      ["evidenceItems", evidenceResult.error],
      ["auditEvents", auditResult.error],
      ["occupationalHealthRefs", healthRefsResult.error],
      ["trainingRecords", trainingResult.error],
    ].filter((entry) => entry[1])

    if (queryErrors.length > 0) {
      const firstError = queryErrors[0]
      const label = String(firstError[0])
      const error = firstError[1] as { message?: string }

      return json(500, {
        ok: false,
        error: "pgr_report_query_failed",
        section: label,
        message: error.message || "PGR report query failed",
      })
    }

    const departments = departmentsResult.data ?? []
    const activities = activitiesResult.data ?? []
    const risks = risksResult.data ?? []
    const actionPlans = actionPlansResult.data ?? []
    const actionFollowupsRaw = actionFollowupsResult.data ?? []
    const actionPlanIds = new Set(
      actionPlans
        .map((item: unknown) => readString(item, ["id"]))
        .filter((id: string | null): id is string => Boolean(id))
    )
    const actionFollowups = actionFollowupsRaw.filter((item: unknown) => {
      const actionPlanId = readString(item, ["action_plan_id", "actionPlanId", "plan_id", "planId"])
      return actionPlanId ? actionPlanIds.has(actionPlanId) : false
    })
    const evidenceItems = evidenceResult.data ?? []
    const auditEvents = auditResult.data ?? []
    const occupationalHealthRefs = healthRefsResult.data ?? []
    const trainingRecords = trainingResult.data ?? []

    return json(200, {
      ok: true,
      report: {
        reportType: "nr1_pgr_json",
        generatedAt: new Date().toISOString(),
        scope: {
          tenantId: scope.tenantId,
          establishmentId,
          membershipRole: scope.role,
        },
        company,
        establishment: establishmentResult.data,
        departments,
        activities,
        risks,
        actionPlans,
        actionFollowups,
        evidenceItems,
        auditEvents,
        occupationalHealthRefs,
        trainingRecords,
        counts: {
          departments: departments.length,
          activities: activities.length,
          risks: risks.length,
          actionPlans: actionPlans.length,
          actionFollowups: actionFollowups.length,
          evidenceItems: evidenceItems.length,
          auditEvents: auditEvents.length,
          occupationalHealthRefs: occupationalHealthRefs.length,
          trainingRecords: trainingRecords.length,
        },
      },
    })
  } catch (error) {
    if (isTenantMembershipDenied(error)) {
      return json(403, {
        ok: false,
        error: "tenant_membership_not_found",
        message: "User is not a member of the requested tenant",
      })
    }

    if (isMissingEstablishment(error)) {
      return json(400, {
        ok: false,
        error: "missing_establishment_id",
        message: "Missing establishmentId",
      })
    }

    const message = error instanceof Error ? error.message : "Unexpected PGR report error"

    return json(500, {
      ok: false,
      error: "pgr_report_unhandled",
      message,
    })
  }
}



