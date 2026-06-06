import { NextRequest, NextResponse } from "next/server"
import type { Database } from "@/lib/database.types"
import {
  createNr1UserClientFromBearer,
  extractBearerToken,
  isTenantAdminRole,
  resolveNr1Scope,
} from "@/lib/server/nr1-scope"

export const dynamic = "force-dynamic"

type Nr1OccupationalHealthRefRow = Database["public"]["Tables"]["nr1_occupational_health_refs"]["Row"]
type Nr1OccupationalHealthRefInsert = Database["public"]["Tables"]["nr1_occupational_health_refs"]["Insert"]

type CreateOccupationalHealthRefBody = {
  establishment_id?: string
  has_pcmso?: boolean | null
  pcmso_exists?: boolean | null
  pcmso_valid_until?: string | null
  pcmso_validity_date?: string | null
  technical_responsible?: string | null
  notes?: string | null
  accident_disease_indicators?: string | null
  has_accident_or_disease_requiring_review?: boolean | null
  work_related_leave_indicators?: string | null
  has_work_related_absences?: boolean | null
}

function json(status: number, payload: Record<string, unknown>) {
  return NextResponse.json(payload, { status })
}

function getTenantId(req: NextRequest): string {
  const queryValue = (req.nextUrl.searchParams.get("tenantId") || "").trim()
  const headerValue = (req.headers.get("x-icanhelp-tenant") || "").trim()
  return queryValue || headerValue
}

function getRequiredEstablishmentId(req: NextRequest): string | null {
  const value = (req.nextUrl.searchParams.get("establishmentId") || "").trim()
  return value || null
}

function cleanText(value: unknown): string | null {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function cleanNullableBoolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null
}

export async function GET(req: NextRequest) {
  try {
    const tenantId = getTenantId(req)
    const establishmentId = getRequiredEstablishmentId(req)

    if (!tenantId) {
      return json(400, {
        ok: false,
        error: "missing_tenant_id",
        message: "Provide tenantId in querystring or x-icanhelp-tenant header",
      })
    }

    if (!establishmentId) {
      return json(400, {
        ok: false,
        error: "missing_establishment_id",
        message: "Provide establishmentId in querystring",
      })
    }

    const scope = await resolveNr1Scope({
      req,
      tenantId,
      establishmentId,
    })

    const bearerToken = extractBearerToken(req)
    if (!bearerToken) {
      return json(401, {
        ok: false,
        error: "missing_bearer",
        message: "Missing bearer token",
      })
    }

    const userClient = createNr1UserClientFromBearer(bearerToken)

    const result = await userClient
      .from("nr1_occupational_health_refs")
      .select("*")
      .eq("tenant_id", scope.tenantId)
      .eq("establishment_id", establishmentId)
      .order("created_at", { ascending: false })

    if (result.error) {
      return json(500, {
        ok: false,
        error: "nr1_occupational_health_refs_list_failed",
        message: result.error.message,
      })
    }

    const rows = (result.data || []) as Nr1OccupationalHealthRefRow[]

    return json(200, {
      ok: true,
      tenantId: scope.tenantId,
      establishmentId,
      membershipRole: scope.role,
      count: rows.length,
      latest: rows.length > 0 ? rows[0] : null,
      items: rows,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error"
    return json(500, {
      ok: false,
      error: "nr1_occupational_health_refs_list_unhandled",
      message,
    })
  }
}

export async function POST(req: NextRequest) {
  try {
    const tenantId = getTenantId(req)

    if (!tenantId) {
      return json(400, {
        ok: false,
        error: "missing_tenant_id",
        message: "Provide tenantId in querystring or x-icanhelp-tenant header",
      })
    }

    const body = (await req.json().catch(() => null)) as CreateOccupationalHealthRefBody | null
    if (!body) {
      return json(400, {
        ok: false,
        error: "invalid_json",
        message: "Request body must be valid JSON",
      })
    }

    const establishmentId = cleanText(body.establishment_id) || getRequiredEstablishmentId(req)
    if (!establishmentId) {
      return json(400, {
        ok: false,
        error: "missing_establishment_id",
        message: "Provide establishment_id in body or establishmentId in querystring",
      })
    }

    const scope = await resolveNr1Scope({
      req,
      tenantId,
      establishmentId,
    })

    if (!isTenantAdminRole(scope.role)) {
      return json(403, {
        ok: false,
        error: "insufficient_role",
        message: "Only owner/admin can create occupational health refs",
      })
    }

    const bearerToken = extractBearerToken(req)
    if (!bearerToken) {
      return json(401, {
        ok: false,
        error: "missing_bearer",
        message: "Missing bearer token",
      })
    }

    const userClient = createNr1UserClientFromBearer(bearerToken)

    const hasWorkRelatedAbsences = cleanNullableBoolean(body.has_work_related_absences)
    const hasAccidentOrDiseaseReview = cleanNullableBoolean(body.has_accident_or_disease_requiring_review)

    const workRelatedLeaveIndicators =
      cleanText(body.work_related_leave_indicators) ||
      (hasWorkRelatedAbsences === true
        ? "Ha dados agregados de afastamentos relacionados ao trabalho."
        : hasWorkRelatedAbsences === false
          ? "Nao ha dados agregados de afastamentos relacionados ao trabalho informados."
          : null)

    const accidentDiseaseIndicators =
      cleanText(body.accident_disease_indicators) ||
      (hasAccidentOrDiseaseReview === true
        ? "Ha dados agregados de acidentes ou doencas que exigem revisao."
        : hasAccidentOrDiseaseReview === false
          ? "Nao ha dados agregados de acidentes ou doencas que exigem revisao informados."
          : null)

    const payload: Nr1OccupationalHealthRefInsert = {
      tenant_id: scope.tenantId,
      establishment_id: establishmentId,
      has_pcmso: cleanNullableBoolean(body.has_pcmso) ?? cleanNullableBoolean(body.pcmso_exists),
      pcmso_valid_until: cleanText(body.pcmso_valid_until) || cleanText(body.pcmso_validity_date),
      technical_responsible: cleanText(body.technical_responsible),
      notes: cleanText(body.notes),
      accident_disease_indicators: accidentDiseaseIndicators,
      work_related_leave_indicators: workRelatedLeaveIndicators,
    }

    const result = await userClient
      .from("nr1_occupational_health_refs")
      .insert(payload)
      .select("*")
      .single()

    if (result.error) {
      return json(500, {
        ok: false,
        error: "nr1_occupational_health_refs_create_failed",
        message: result.error.message,
      })
    }

    const row = result.data as Nr1OccupationalHealthRefRow

    return json(201, {
      ok: true,
      tenantId: scope.tenantId,
      establishmentId,
      membershipRole: scope.role,
      item: row,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error"
    return json(500, {
      ok: false,
      error: "nr1_occupational_health_refs_create_unhandled",
      message,
    })
  }
}
